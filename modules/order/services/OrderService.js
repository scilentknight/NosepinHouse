import AppError from "@/core/errors/AppError";
import { notify } from "@/lib/notify";
import { sendMailBestEffort, orderStatusUpdateEmail } from "@/lib/mail";
import { renderInvoicePdf } from "@/lib/invoice";

const ALLOWED_TRANSITIONS = {
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

function serializeAdminOrderList(orders, total, page, pageSize) {
  const data = orders.map(({ items, ...order }) => ({
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    total: Number(order.total),
    itemCount: items.length,
  }));
  return { orders: data, total, page, pageSize };
}

function serializeAdminOrderDetail(order) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shippingFee: Number(order.shippingFee),
    tax: Number(order.tax),
    total: Number(order.total),
    coupon: order.coupon ? { ...order.coupon, value: Number(order.coupon.value) } : null,
    items: order.items.map((item) => ({ ...item, price: Number(item.price) })),
  };
}

function serializeUserOrders(orders) {
  return orders.map((order) => ({
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    total: Number(order.total),
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
      reviewed: item.reviews.length > 0,
      productSlug: item.product && !item.product.deletedAt ? item.product.slug : null,
      product: undefined,
    })),
  }));
}

export default class OrderService {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }

  async getAdminOrders(filters) {
    const { orders, total } = await this.orderRepository.findManyAdmin(filters);
    return serializeAdminOrderList(orders, total, filters.page, filters.pageSize);
  }

  async getAdminOrderById(id) {
    const order = await this.orderRepository.findByIdAdmin(id);
    if (!order) throw new AppError(404, "Order not found");
    return serializeAdminOrderDetail(order);
  }

  async updateOrderStatus(id, { status: target, trackingNumber, courierName, note }) {
    const order = await this.orderRepository.findByIdWithItems(id);
    if (!order) throw new AppError(404, "Order not found");

    if (!ALLOWED_TRANSITIONS[order.status].includes(target)) {
      throw new AppError(400, `Cannot move an order from ${order.status} to ${target}`);
    }

    if (target === "SHIPPED" && (!trackingNumber || !courierName)) {
      throw new AppError(400, "Tracking number and courier name are required to mark as shipped");
    }

    const data = { status: target };
    let message = "";

    if (target === "SHIPPED") {
      data.trackingNumber = trackingNumber;
      data.courierName = courierName;
      message = `Your order ${order.orderNumber} has shipped via ${courierName}.`;
    }

    if (target === "CANCELLED") {
      if (order.paymentStatus === "PAID") data.refunded = true;
      message = `Your order ${order.orderNumber} has been cancelled.`;
    }

    if (target === "DELIVERED") {
      if (order.paymentMethod === "COD" && order.paymentStatus === "PENDING") {
        data.paymentStatus = "PAID";
      }
      message = `Your order ${order.orderNumber} has been delivered.`;
    }

    const restockItems = target === "CANCELLED" ? order.items : [];

    await this.orderRepository.updateStatusWithHistory(id, data, note ?? null, restockItems);

    if (message) {
      await notify(order.userId, message);
      await sendMailBestEffort({
        to: order.email,
        ...orderStatusUpdateEmail({ orderNumber: order.orderNumber, fullName: order.fullName }, message),
      });
    }
  }

  async getAdminInvoicePdf(id, isPreview) {
    const order = await this.orderRepository.findByIdWithItems(id);
    if (!order) throw new AppError(404, "Order not found");
    const buffer = await renderInvoicePdf({
      orderNumber: order.orderNumber,
      placedAt: order.placedAt.toISOString(),
      fullName: order.fullName,
      phone: order.phone,
      email: order.email,
      line1: order.line1,
      line2: order.line2,
      city: order.city,
      state: order.state,
      postalCode: order.postalCode,
      country: order.country,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      shippingFee: Number(order.shippingFee),
      tax: Number(order.tax),
      taxLabel: order.taxLabel,
      total: Number(order.total),
      items: order.items.map((item) => ({ name: item.name, price: Number(item.price), quantity: item.quantity })),
    });
    return { buffer, orderNumber: order.orderNumber, isPreview };
  }

  async processAdminReturn(id, { action, note }) {
    const order = await this.orderRepository.findByIdWithItems(id);
    if (!order) throw new AppError(404, "Order not found");
    if (order.status !== "DELIVERED" || !order.returnRequested) {
      throw new AppError(400, "This order has no pending return request");
    }
    const approved = action === "approve";
    const noteBase = approved ? "Return approved" : "Return rejected";
    const fullNote = note ? `${noteBase}: ${note}` : noteBase;
    await this.orderRepository.processReturn(id, approved, fullNote, order.paymentStatus === "PAID");
    const returnMessage = approved
      ? `Your return request for order ${order.orderNumber} was approved.`
      : `Your return request for order ${order.orderNumber} was rejected.`;
    await notify(order.userId, returnMessage);
    await sendMailBestEffort({
      to: order.email,
      ...orderStatusUpdateEmail({ orderNumber: order.orderNumber, fullName: order.fullName }, returnMessage),
    });
  }

  async getUserOrders(userId, status) {
    const orders = await this.orderRepository.findManyForUser(userId, status);
    return serializeUserOrders(orders);
  }

  async cancelUserOrder(userId, id, reason) {
    const order = await this.orderRepository.findByIdForUserWithItems(id, userId);
    if (!order) throw new AppError(404, "Order not found");
    if (order.status !== "PROCESSING") {
      throw new AppError(400, "This order can no longer be cancelled");
    }
    const note = reason ? `Cancelled by customer: ${reason}` : "Cancelled by customer";
    await this.orderRepository.cancelOrder(id, order.paymentStatus, order.items, note);
    await notify(userId, `Your order ${order.orderNumber} has been cancelled.`);
  }

  async requestUserReturn(userId, id, reason) {
    const order = await this.orderRepository.findByIdForUser(id, userId);
    if (!order) throw new AppError(404, "Order not found");
    if (order.status !== "DELIVERED" || order.returnRequested) {
      throw new AppError(400, "This order is not eligible for a return request");
    }
    await this.orderRepository.requestReturn(id, reason);
    const admins = await this.orderRepository.findAdminUsers();
    await Promise.all([
      notify(userId, `Your return request for order ${order.orderNumber} has been submitted.`),
      ...admins.map((admin) => notify(admin.id, `Return requested for order ${order.orderNumber}.`)),
    ]);
  }

  async getUserInvoicePdf(userId, id, isPreview) {
    const order = await this.orderRepository.findByIdForUserWithItems(id, userId);
    if (!order) throw new AppError(404, "Order not found");
    const buffer = await renderInvoicePdf({
      orderNumber: order.orderNumber,
      placedAt: order.placedAt.toISOString(),
      fullName: order.fullName,
      phone: order.phone,
      email: order.email,
      line1: order.line1,
      line2: order.line2,
      city: order.city,
      state: order.state,
      postalCode: order.postalCode,
      country: order.country,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      shippingFee: Number(order.shippingFee),
      tax: Number(order.tax),
      taxLabel: order.taxLabel,
      total: Number(order.total),
      items: order.items.map((item) => ({ name: item.name, price: Number(item.price), quantity: item.quantity })),
    });
    return { buffer, orderNumber: order.orderNumber, isPreview };
  }
}
