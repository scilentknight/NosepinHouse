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
    };
  });
}

export default class WishlistService {
  constructor(wishlistRepository) {
    this.wishlistRepository = wishlistRepository;
  }

  async getWishlistLines(userId) {
    const wishlist = await this.wishlistRepository.getOrCreateWishlist(userId);
    const items = await this.wishlistRepository.findWishlistItems(wishlist.id);
    return toLines(items);
  }

  async addToWishlist(userId, body) {
    const productId = Number(body.productId);
    const variantId =
      body.variantId !== undefined && body.variantId !== null ? Number(body.variantId) : null;

    if (!body.productId || Number.isNaN(productId)) {
      throw new AppError("productId is required", 400);
    }
    if (variantId !== null && Number.isNaN(variantId)) {
      throw new AppError("Invalid variantId", 400);
    }

    const product = await this.wishlistRepository.findProductAvailability(productId);
    if (!product) {
      throw new AppError("This product is no longer available", 404);
    }

    if (variantId !== null) {
      const variant = await this.wishlistRepository.findVariantAvailability(variantId, productId);
      if (!variant) {
        throw new AppError("This variant is no longer available", 404);
      }
    }

    const wishlist = await this.wishlistRepository.getOrCreateWishlist(userId);
    const existing = await this.wishlistRepository.findWishlistItem(wishlist.id, productId, variantId);

    if (!existing) {
      await this.wishlistRepository.createWishlistItem(wishlist.id, productId, variantId);
    }

    interactionTrackingService
      .trackEvent({
        userId,
        productId,
        eventType: "WISHLIST_ADD",
        metadata: { variantId },
      })
      .catch(() => {});

    return this.getWishlistLines(userId);
  }

  async removeFromWishlist(userId, searchParams) {
    const rawProductId = searchParams.get("productId");
    const productId = rawProductId ? Number(rawProductId) : null;
    const rawVariantId = searchParams.get("variantId");
    const variantId = rawVariantId ? Number(rawVariantId) : null;

    const wishlist = await this.wishlistRepository.getOrCreateWishlist(userId);

    if (productId !== null && !Number.isNaN(productId)) {
      await this.wishlistRepository.deleteWishlistItems({
        wishlistId: wishlist.id,
        productId,
        variantId,
      });

      interactionTrackingService
        .trackEvent({
          userId,
          productId,
          eventType: "WISHLIST_REMOVE",
          metadata: { variantId },
        })
        .catch(() => {});
    } else {
      await this.wishlistRepository.deleteWishlistItems({
        wishlistId: wishlist.id,
      });
    }

    return this.getWishlistLines(userId);
  }
}
