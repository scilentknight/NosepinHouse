import {
  applyCoupon,
  computeSubtotal,
  computeShippingAndTax,
  createOrderFromCart,
  loadValidatedCart,
  resolveShippingAddress,
  parseSelectedItems,
} from "@/lib/checkoutCore";
import { getPaymentSettings } from "@/lib/settings";
import { generateOrderNumber } from "@/lib/orderNumber";
import { buildEsewaFormFields, resolveEsewaConfig, checkEsewaStatus } from "@/lib/esewa";
import { notify } from "@/lib/notify";
import { sendMailBestEffort, orderConfirmationEmail } from "@/lib/mail";
import { renderInvoicePdf } from "@/lib/invoice";
import AppError from "@/core/errors/AppError";
import { interactionTrackingService } from "@/modules/recommendation";

export default class CheckoutService {
  async placeCodOrder(user, body) {
    if (body.paymentMethod !== "COD") {
      throw new AppError(400, "Use /api/checkout/esewa/initiate for online payment");
    }

    const shipping = await resolveShippingAddress(user, body);
    const selectedItems = parseSelectedItems(body);
    const cart = await loadValidatedCart(user.id, selectedItems);
    const subtotal = computeSubtotal(cart);

    const paymentSettings = await getPaymentSettings();
    if (!paymentSettings.codEnabled) {
      throw new AppError(400, "Cash on Delivery is currently unavailable");
    }
    if (paymentSettings.codMinOrderAmount && subtotal < Number(paymentSettings.codMinOrderAmount)) {
      throw new AppError(400, `Minimum order amount for Cash on Delivery is Rs ${Number(paymentSettings.codMinOrderAmount)}`);
    }
    if (paymentSettings.codMaxOrderAmount && subtotal > Number(paymentSettings.codMaxOrderAmount)) {
      throw new AppError(400, `Maximum order amount for Cash on Delivery is Rs ${Number(paymentSettings.codMaxOrderAmount)}`);
    }

    const { discount, couponId } = await applyCoupon(subtotal, body.couponCode);
    const { shippingFee, tax, taxLabel } = await computeShippingAndTax(shipping.country, subtotal, discount, shipping.municipalityId);

    const order = await createOrderFromCart({
      userId: user.id,
      shipping,
      cart,
      subtotal,
      discount,
      shippingFee,
      tax,
      taxLabel,
      couponId,
      paymentMethod: "COD",
      paymentSubMethod: null,
      paymentStatus: "PENDING",
      historyNote: "Order placed",
    });

    await notify(user.id, `Your order ${order.orderNumber} has been placed and is now Processing.`);

    for (const item of cart.items) {
      interactionTrackingService
        .trackEvent({
          userId: user.id,
          productId: item.productId,
          eventType: "PURCHASE",
          metadata: { orderNumber: order.orderNumber, quantity: item.quantity },
        })
        .catch(() => {});
    }

    const items = cart.items.map((item) => ({
      name: item.product.name,
      price: Number(item.product.price),
      quantity: item.quantity,
    }));

    let invoiceAttachment;
    try {
      const pdf = await renderInvoicePdf({
        orderNumber: order.orderNumber,
        placedAt: order.placedAt.toISOString(),
        fullName: shipping.fullName,
        phone: shipping.phone,
        email: shipping.email,
        line1: shipping.line1,
        line2: shipping.line2,
        city: shipping.city,
        state: shipping.state,
        postalCode: shipping.postalCode,
        country: shipping.country,
        paymentMethod: "COD",
        paymentStatus: order.paymentStatus,
        subtotal,
        discount,
        shippingFee,
        tax,
        taxLabel,
        total: Number(order.total),
        items,
      });
      invoiceAttachment = { filename: `invoice-${order.orderNumber}.pdf`, content: pdf, contentType: "application/pdf" };
    } catch (err) {
      console.error("[checkout] failed to generate invoice attachment:", err);
    }

    await sendMailBestEffort({
      to: shipping.email,
      ...orderConfirmationEmail({
        orderNumber: order.orderNumber,
        fullName: shipping.fullName,
        paymentMethod: "COD",
        items,
        subtotal,
        discount,
        shippingFee,
        tax,
        taxLabel,
        total: Number(order.total),
        shipping,
      }),
      attachments: invoiceAttachment ? [invoiceAttachment] : undefined,
    });

    return { orderNumber: order.orderNumber };
  }

  async initiateEsewaPayment(user, body, requestUrl) {
    const paymentSettings = await getPaymentSettings();
    if (!paymentSettings.esewaEnabled) {
      throw new AppError(400, "Online payment via eSewa is currently unavailable");
    }

    const shipping = await resolveShippingAddress(user, body, { persist: false });
    const cart = await loadValidatedCart(user.id);
    const subtotal = computeSubtotal(cart);
    const { discount } = await applyCoupon(subtotal, body.couponCode);
    const { shippingFee, tax, total } = await computeShippingAndTax(shipping.country, subtotal, discount, shipping.municipalityId);

    if (total <= 0) {
      throw new AppError(400, "Order total must be greater than zero to pay online");
    }

    const transactionUuid = generateOrderNumber();
    const baseUrl = (process.env.NEXTAUTH_URL ?? new URL(requestUrl).origin).replace(/\/$/, "");
    const returnUrl = `${baseUrl}/checkout/esewa/return?txn=${transactionUuid}`;
    const esewaConfig = resolveEsewaConfig(paymentSettings);
    const fields = buildEsewaFormFields({
      transactionUuid,
      productAmount: Math.max(0, subtotal - discount),
      taxAmount: tax,
      deliveryCharge: shippingFee,
      successUrl: returnUrl,
      failureUrl: returnUrl,
      config: esewaConfig,
    });

    return { transactionUuid, formUrl: esewaConfig.paymentUrl, fields };
  }

  async completeEsewaPayment(user, body) {
    const { prisma } = await import("@/lib/prisma");
    const transactionUuid = body.transactionUuid;
    if (!transactionUuid) throw new AppError(400, "Missing transaction reference");

    const existing = await prisma.order.findUnique({ where: { orderNumber: transactionUuid } });
    if (existing) return { orderNumber: existing.orderNumber, alreadyRecorded: true };

    const shipping = await resolveShippingAddress(user, body);
    const selectedItems = parseSelectedItems(body);
    const cart = await loadValidatedCart(user.id, selectedItems);
    const subtotal = computeSubtotal(cart);
    const { discount, couponId } = await applyCoupon(subtotal, body.couponCode);
    const { shippingFee, tax, taxLabel, total } = await computeShippingAndTax(shipping.country, subtotal, discount, shipping.municipalityId);

    const paymentSettings = await getPaymentSettings();
    const esewaConfig = resolveEsewaConfig(paymentSettings);
    const result = await checkEsewaStatus(transactionUuid, total, esewaConfig);

    if (result.status !== "COMPLETE") {
      throw new AppError(402, `Payment ${result.status.toLowerCase()} — no order was created. Your cart is unchanged.`);
    }

    if (Math.abs(Number(result.total_amount) - total) > 0.01) {
      throw new AppError(409, "The confirmed payment amount doesn't match your cart total. Please contact support before retrying.");
    }

    const order = await createOrderFromCart({
      orderNumber: transactionUuid,
      userId: user.id,
      shipping,
      cart,
      subtotal,
      discount,
      shippingFee,
      tax,
      taxLabel,
      couponId,
      paymentMethod: "ONLINE",
      paymentSubMethod: "ESEWA",
      paymentStatus: "PAID",
      paymentReference: result.ref_id,
      historyNote: `Order placed — paid via eSewa (ref: ${result.ref_id ?? "n/a"})`,
    });

    await notify(user.id, `Your order ${order.orderNumber} has been placed and is now Processing.`);

    for (const item of cart.items) {
      interactionTrackingService
        .trackEvent({
          userId: user.id,
          productId: item.productId,
          eventType: "PURCHASE",
          metadata: { orderNumber: order.orderNumber, quantity: item.quantity },
        })
        .catch(() => {});
    }

    const items = cart.items.map((item) => ({
      name: item.product.name,
      price: Number(item.product.price),
      quantity: item.quantity,
    }));

    let invoiceAttachment;
    try {
      const pdf = await renderInvoicePdf({
        orderNumber: order.orderNumber,
        placedAt: order.placedAt.toISOString(),
        fullName: shipping.fullName,
        phone: shipping.phone,
        email: shipping.email,
        line1: shipping.line1,
        line2: shipping.line2,
        city: shipping.city,
        state: shipping.state,
        postalCode: shipping.postalCode,
        country: shipping.country,
        paymentMethod: "ONLINE",
        paymentStatus: order.paymentStatus,
        subtotal,
        discount,
        shippingFee,
        tax,
        taxLabel,
        total: Number(order.total),
        items,
      });
      invoiceAttachment = { filename: `invoice-${order.orderNumber}.pdf`, content: pdf, contentType: "application/pdf" };
    } catch (err) {
      console.error("[checkout] failed to generate invoice attachment:", err);
    }

    await sendMailBestEffort({
      to: shipping.email,
      ...orderConfirmationEmail({
        orderNumber: order.orderNumber,
        fullName: shipping.fullName,
        paymentMethod: "ONLINE",
        items,
        subtotal,
        discount,
        shippingFee,
        tax,
        taxLabel,
        total: Number(order.total),
        shipping,
      }),
      attachments: invoiceAttachment ? [invoiceAttachment] : undefined,
    });

    return { orderNumber: order.orderNumber, alreadyRecorded: false };
  }
}
