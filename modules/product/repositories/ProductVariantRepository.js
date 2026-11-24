import { prisma } from "@/lib/prisma";

export default class ProductVariantRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findByProductId(productId, trashed = false) {
    return this.db.productVariant.findMany({
      where: {
        productId: Number(productId),
        deletedAt: trashed ? { not: null } : null,
      },
      orderBy: { createdAt: "asc" },
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
    });
  }

  async findById(id) {
    return this.db.productVariant.findUnique({
      where: { id: Number(id) },
    });
  }

  async create(productId, data) {
    return this.db.productVariant.create({
      data: {
        productId: Number(productId),
        sku: data.sku || null,
        price: data.price ?? null,
        compareAtPrice: data.compareAtPrice ?? null,
        costPrice: data.costPrice ?? null,
        stockQuantity: data.stockQuantity,
        lowStockAlert: data.lowStockAlert ?? null,
        weight: data.weight ?? null,
        image: data.image || null,
        status: data.status,
        attributeValues: {
          create: data.attributeValueIds.map((attributeValueId) => ({ attributeValueId })),
        },
      },
    });
  }

  async update(id, data) {
    const numId = Number(id);
    return this.db.$transaction(async (tx) => {
      await tx.productVariantValue.deleteMany({ where: { variantId: numId } });
      return tx.productVariant.update({
        where: { id: numId },
        data: {
          sku: data.sku || null,
          price: data.price ?? null,
          compareAtPrice: data.compareAtPrice ?? null,
          costPrice: data.costPrice ?? null,
          stockQuantity: data.stockQuantity,
          lowStockAlert: data.lowStockAlert ?? null,
          weight: data.weight ?? null,
          image: data.image || null,
          status: data.status,
          attributeValues: {
            create: data.attributeValueIds.map((attributeValueId) => ({ attributeValueId })),
          },
        },
      });
    });
  }

  async softDelete(id) {
    return this.db.productVariant.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id) {
    return this.db.productVariant.update({
      where: { id: Number(id) },
      data: { deletedAt: null },
    });
  }

  async findAttributeValuesByIds(ids) {
    return this.db.attributeValue.findMany({
      where: { id: { in: ids } },
    });
  }

  async findExistingActiveVariants(productId) {
    return this.db.productVariant.findMany({
      where: { productId: Number(productId), deletedAt: null },
      include: { attributeValues: true },
    });
  }

  async createGeneratedVariant(data) {
    return this.db.productVariant.create({ data });
  }

  async bulkUpdate(ids, productId, data) {
    return this.db.productVariant.updateMany({
      where: {
        id: { in: ids.map(Number) },
        productId: Number(productId),
      },
      data,
    });
  }

  async bulkSoftDelete(ids, productId) {
    return this.db.productVariant.updateMany({
      where: {
        id: { in: ids.map(Number) },
        productId: Number(productId),
      },
      data: { deletedAt: new Date() },
    });
  }

  async bulkRestore(ids, productId) {
    return this.db.productVariant.updateMany({
      where: {
        id: { in: ids.map(Number) },
        productId: Number(productId),
      },
      data: { deletedAt: null },
    });
  }
}
