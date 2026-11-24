import { prisma } from "@/lib/prisma";

const cartItemInclude = {
  product: { include: { images: { take: 1 } } },
  variant: {
    include: {
      attributeValues: {
        include: {
          attributeValue: {
            include: {
              attribute: true,
            },
          },
        },
      },
    },
  },
};

export default class CartRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async getOrCreateCart(userId) {
    return this.db.cart.upsert({
      where: { userId: Number(userId) },
      update: {},
      create: { userId: Number(userId) },
    });
  }

  async findCartItems(cartId) {
    return this.db.cartItem.findMany({
      where: { cartId: Number(cartId) },
      include: cartItemInclude,
    });
  }

  async findCartItem(cartId, productId, variantId) {
    return this.db.cartItem.findFirst({
      where: {
        cartId: Number(cartId),
        productId: Number(productId),
        variantId: variantId !== null && variantId !== undefined ? Number(variantId) : null,
      },
    });
  }

  async findProductAvailability(productId) {
    return this.db.product.findFirst({
      where: { id: Number(productId), status: "PUBLISHED", deletedAt: null },
      select: { id: true, stock: true },
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
      select: { stockQuantity: true },
    });
  }

  async createCartItem(cartId, productId, variantId, quantity) {
    return this.db.cartItem.create({
      data: {
        cartId: Number(cartId),
        productId: Number(productId),
        variantId: variantId !== null && variantId !== undefined ? Number(variantId) : null,
        quantity: Number(quantity),
      },
    });
  }

  async updateCartItemQuantity(id, quantity) {
    return this.db.cartItem.update({
      where: { id: Number(id) },
      data: { quantity: Number(quantity) },
    });
  }

  async updateCartItemQuantityByMatch(cartId, productId, variantId, quantity) {
    return this.db.cartItem.updateMany({
      where: {
        cartId: Number(cartId),
        productId: Number(productId),
        variantId: variantId !== null && variantId !== undefined ? Number(variantId) : null,
      },
      data: { quantity: Number(quantity) },
    });
  }

  async deleteCartItems(where) {
    return this.db.cartItem.deleteMany({
      where,
    });
  }

  async findValidProducts(productIds) {
    return this.db.product.findMany({
      where: { id: { in: productIds }, status: "PUBLISHED", deletedAt: null },
      select: { id: true },
    });
  }

  async findValidVariants(variantIds) {
    return this.db.productVariant.findMany({
      where: { id: { in: variantIds }, status: "ACTIVE", deletedAt: null },
      select: { id: true, productId: true },
    });
  }
}
