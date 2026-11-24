import AppError from "@/core/errors/AppError";
import { variantLabel } from "@/lib/checkoutCore";
import { interactionTrackingService } from "@/modules/recommendation";

function toLines(items) {
  return items.map((item) => {
    const price = Number(item.variant?.price ?? item.product.price);
    const compareAt = item.variant?.compareAtPrice ?? item.product.compareAtPrice;
    const compareAtPrice = compareAt != null ? Number(compareAt) : null;
    const discountPercent =
      item.product.discountPercent != null
        ? Number(item.product.discountPercent)
        : compareAtPrice && compareAtPrice > price
        ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
        : null;

    return {
      productId: item.product.id,
      variantId: item.variantId,
      variantLabel: variantLabel(item.variant),
      name: item.product.name,
      slug: item.product.slug,
      price,
      compareAtPrice,
      discountPercent,
      image: item.variant?.image ?? item.product.images[0]?.url ?? null,
      colorway: item.product.colorway,
      stock: item.variant ? item.variant.stockQuantity : item.product.stock,
      quantity: item.quantity,
    };
  });
}

export default class CartService {
  constructor(cartRepository) {
    this.cartRepository = cartRepository;
  }

  async getCartLines(userId) {
    const cart = await this.cartRepository.getOrCreateCart(userId);
    const items = await this.cartRepository.findCartItems(cart.id);
    return toLines(items);
  }

  async addToCart(userId, body) {
    const productId = Number(body.productId);
    const variantId =
      body.variantId !== undefined && body.variantId !== null ? Number(body.variantId) : null;
    const quantity = body.quantity ?? 1;

    if (!body.productId || Number.isNaN(productId)) {
      throw new AppError("productId is required", 400);
    }
    if (variantId !== null && Number.isNaN(variantId)) {
      throw new AppError("Invalid variantId", 400);
    }

    const product = await this.cartRepository.findProductAvailability(productId);
    if (!product) {
      throw new AppError("This product is no longer available", 404);
    }

    let availableStock = product.stock;
    if (variantId !== null) {
      const variant = await this.cartRepository.findVariantAvailability(variantId, productId);
      if (!variant) {
        throw new AppError("This variant is no longer available", 404);
      }
      availableStock = variant.stockQuantity;
    }

    const cart = await this.cartRepository.getOrCreateCart(userId);
    const existing = await this.cartRepository.findCartItem(cart.id, productId, variantId);

    const totalQuantity = (existing?.quantity ?? 0) + quantity;
    if (totalQuantity > availableStock) {
      throw new AppError(`Only ${availableStock} left in stock`, 400);
    }

    if (existing) {
      await this.cartRepository.updateCartItemQuantity(existing.id, totalQuantity);
    } else {
      await this.cartRepository.createCartItem(cart.id, productId, variantId, quantity);
    }

    interactionTrackingService
      .trackEvent({
        userId,
        productId,
        eventType: "CART_ADD",
        metadata: { quantity, variantId },
      })
      .catch(() => {});

    return this.getCartLines(userId);
  }

  async updateCartItem(userId, body) {
    const productId = Number(body.productId);
    const variantId =
      body.variantId !== undefined && body.variantId !== null ? Number(body.variantId) : null;
    const quantity = body.quantity;

    if (!body.productId || Number.isNaN(productId) || typeof quantity !== "number") {
      throw new AppError("productId and quantity are required", 400);
    }

    const cart = await this.cartRepository.getOrCreateCart(userId);

    if (quantity <= 0) {
      await this.cartRepository.deleteCartItems({
        cartId: cart.id,
        productId,
        variantId,
      });
    } else {
      const product = await this.cartRepository.findProductAvailability(productId);
      if (!product) {
        throw new AppError("This product is no longer available", 404);
      }

      let availableStock = product.stock;
      if (variantId !== null) {
        const variant = await this.cartRepository.findVariantAvailability(variantId, productId);
        if (!variant) {
          throw new AppError("This variant is no longer available", 404);
        }
        availableStock = variant.stockQuantity;
      }

      if (quantity > availableStock) {
        throw new AppError(`Only ${availableStock} left in stock`, 400);
      }

      await this.cartRepository.updateCartItemQuantityByMatch(cart.id, productId, variantId, quantity);
    }

    return this.getCartLines(userId);
  }

  async removeCartItem(userId, searchParams) {
    const rawProductId = searchParams.get("productId");
    const productId = rawProductId ? Number(rawProductId) : null;
    const rawVariantId = searchParams.get("variantId");
    const variantId = rawVariantId ? Number(rawVariantId) : null;

    const cart = await this.cartRepository.getOrCreateCart(userId);

    if (productId !== null && !Number.isNaN(productId)) {
      await this.cartRepository.deleteCartItems({
        cartId: cart.id,
        productId,
        variantId,
      });

      interactionTrackingService
        .trackEvent({
          userId,
          productId,
          eventType: "CART_REMOVE",
          metadata: { variantId },
        })
        .catch(() => {});
    } else {
      await this.cartRepository.deleteCartItems({ cartId: cart.id });
    }

    return this.getCartLines(userId);
  }

  async mergeCart(userId, body) {
    const { items = [] } = body;
    const cart = await this.cartRepository.getOrCreateCart(userId);

    const requestedIds = items
      .map((i) => Number(i.productId))
      .filter((id) => !Number.isNaN(id));

    const validProducts = await this.cartRepository.findValidProducts(requestedIds);
    const validIds = new Set(validProducts.map((p) => p.id));

    const requestedVariantIds = items
      .map((i) => (i.variantId !== undefined && i.variantId !== null ? Number(i.variantId) : null))
      .filter((id) => id !== null && !Number.isNaN(id));

    const validVariants =
      requestedVariantIds.length > 0
        ? await this.cartRepository.findValidVariants(requestedVariantIds)
        : [];

    const validVariantByProduct = new Map(validVariants.map((v) => [v.id, v.productId]));

    for (const item of items) {
      const productId = Number(item.productId);
      if (Number.isNaN(productId) || !validIds.has(productId)) continue;

      let variantId =
        item.variantId !== undefined && item.variantId !== null ? Number(item.variantId) : null;
      if (
        variantId !== null &&
        (Number.isNaN(variantId) || validVariantByProduct.get(variantId) !== productId)
      ) {
        variantId = null;
      }

      const existing = await this.cartRepository.findCartItem(cart.id, productId, variantId);

      if (existing) {
        await this.cartRepository.updateCartItemQuantity(existing.id, existing.quantity + item.quantity);
      } else {
        await this.cartRepository.createCartItem(cart.id, productId, variantId, item.quantity);
      }
    }
  }
}
