import { prisma } from "@/lib/prisma";

const wishlistItemInclude = {
  product: { include: { images: { take: 1 } } },
  variant: {
    include: {
      attributeValues: {
        include: { attributeValue: { include: { attribute: true } } },
      },
    },
  },
};

export default class WishlistRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async getOrCreateWishlist(userId) {
    return this.db.wishlist.upsert({
      where: { userId: Number(userId) },
      update: {},
      create: { userId: Number(userId) },
    });
  }

  async findWishlistItems(wishlistId) {
    return this.db.wishlistItem.findMany({
      where: { wishlistId: Number(wishlistId) },
      include: wishlistItemInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async findWishlistItem(wishlistId, productId, variantId) {
    return this.db.wishlistItem.findFirst({
      where: {
        wishlistId: Number(wishlistId),
        productId: Number(productId),
        variantId: variantId !== null && variantId !== undefined ? Number(variantId) : null,
      },
    });
  }

  async findProductAvailability(productId) {
    return this.db.product.findFirst({
      where: { id: Number(productId), status: "PUBLISHED", deletedAt: null },
      select: { id: true },
    });
  }

  async findVariantAvailability(variantId, productId) {
    return this.db.productVariant.findFirst({
      where: {
        id: Number(variantId),
        productId: Number(productId),
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  async createWishlistItem(wishlistId, productId, variantId) {
    return this.db.wishlistItem.create({
      data: {
        wishlistId: Number(wishlistId),
        productId: Number(productId),
        variantId: variantId !== null && variantId !== undefined ? Number(variantId) : null,
      },
    });
  }

  async deleteWishlistItems(where) {
    return this.db.wishlistItem.deleteMany({
      where,
    });
  }
}
