import { prisma } from "@/lib/prisma";

export default class ProductRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  /**
   * Find published products by list of IDs
   */
  async findByIds(idList) {
    return this.db.product.findMany({
      where: {
        id: { in: idList },
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: { sortOrder: "asc" },
        },
        materials: {
          orderBy: { sortOrder: "asc" },
          include: {
            material: true,
            purity: true,
          },
        },
        variants: {
          where: {
            status: "ACTIVE",
            deletedAt: null,
          },
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
          orderBy: { id: "asc" },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });
  }

  /**
   * Find published products for customer catalog with pagination, filters, and sorting
   */
  async findPublishedProducts({ where, orderBy, skip, take }) {
    return this.db.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 10,
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy,
      skip,
      take,
    });
  }

  /**
   * Count published products matching customer catalog filter criteria
   */
  async countPublishedProducts(where) {
    return this.db.product.count({ where });
  }

  /**
   * Find single published product by slug with complete storefront relations
   */
  async findBySlug(slug) {
    return this.db.product.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: { sortOrder: "asc" },
        },
        materials: {
          orderBy: { sortOrder: "asc" },
          include: {
            material: true,
            purity: true,
            stoneMaterial: true,
          },
        },
        variants: {
          where: {
            status: "ACTIVE",
            deletedAt: null,
          },
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
        reviews: {
          include: {
            user: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Admin list of products with filters, search, and pagination
   */
  async findAdminProducts({ where, skip, take }) {
    return this.db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        materials: { include: { material: true, purity: true, stoneMaterial: true } },
        _count: { select: { variants: true } },
      },
      skip,
      take,
    });
  }

  /**
   * Count admin products matching filters
   */
  async countAdminProducts(where) {
    return this.db.product.count({ where });
  }

  /**
   * Find raw product by ID
   */
  async findById(id) {
    return this.db.product.findUnique({
      where: { id: Number(id) },
    });
  }

  /**
   * Find product by ID with admin edit relations
   */
  async findByIdWithAdminDetails(id) {
    return this.db.product.findUnique({
      where: { id: Number(id) },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        materials: {
          include: { material: true, purity: true, stoneMaterial: true },
          orderBy: { sortOrder: "asc" },
        },
        relationsFrom: {
          include: {
            related: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /**
   * Create a new product with materials, images, and relations in a transaction
   */
  async createWithDetails({ productData, materialsData, imagesData, relationsData }) {
    return this.db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...productData,
          materials: {
            create: materialsData,
          },
          images: {
            create: imagesData,
          },
        },
        include: {
          materials: {
            include: { material: true, purity: true, stoneMaterial: true },
          },
          images: true,
        },
      });

      if (relationsData) {
        const { relatedIds = [], crossSellIds = [], upSellIds = [] } = relationsData;
        const rows = [
          ...relatedIds.map((relatedId, i) => ({ productId: created.id, relatedId, type: "RELATED", sortOrder: i })),
          ...crossSellIds.map((relatedId, i) => ({ productId: created.id, relatedId, type: "CROSS_SELL", sortOrder: i })),
          ...upSellIds.map((relatedId, i) => ({ productId: created.id, relatedId, type: "UP_SELL", sortOrder: i })),
        ].filter((r) => r.relatedId !== created.id);

        if (rows.length > 0) {
          await tx.productRelation.createMany({ data: rows });
        }
      }

      return created;
    });
  }

  /**
   * Update an existing product, replacing materials, images, and syncing relations
   */
  async updateWithDetails(id, { productData, materialsData, imagesData, relationsData }) {
    const numId = Number(id);
    return this.db.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: numId } });
      await tx.productMaterial.deleteMany({ where: { productId: numId } });

      const updated = await tx.product.update({
        where: { id: numId },
        data: {
          ...productData,
          materials: {
            create: materialsData,
          },
          images: {
            create: imagesData,
          },
        },
        include: {
          materials: { include: { material: true, purity: true, stoneMaterial: true } },
          images: true,
        },
      });

      if (relationsData) {
        const { relatedIds = [], crossSellIds = [], upSellIds = [] } = relationsData;
        await tx.productRelation.deleteMany({ where: { productId: numId } });
        const rows = [
          ...relatedIds.map((relatedId, i) => ({ productId: numId, relatedId, type: "RELATED", sortOrder: i })),
          ...crossSellIds.map((relatedId, i) => ({ productId: numId, relatedId, type: "CROSS_SELL", sortOrder: i })),
          ...upSellIds.map((relatedId, i) => ({ productId: numId, relatedId, type: "UP_SELL", sortOrder: i })),
        ].filter((r) => r.relatedId !== numId);

        if (rows.length > 0) {
          await tx.productRelation.createMany({ data: rows });
        }
      }

      return updated;
    });
  }

  /**
   * Cascade delete product and all associated dependencies
   */
  async deleteCascade(id) {
    const numId = Number(id);
    return this.db.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { productId: numId },
        data: { productId: null },
      });
      await tx.cartItem.deleteMany({ where: { productId: numId } });
      await tx.wishlistItem.deleteMany({ where: { productId: numId } });
      await tx.review.deleteMany({ where: { productId: numId } });
      await tx.productRelation.deleteMany({
        where: { OR: [{ productId: numId }, { relatedId: numId }] },
      });

      const variants = await tx.productVariant.findMany({
        where: { productId: numId },
        select: { id: true },
      });
      const variantIds = variants.map((v) => v.id);
      if (variantIds.length > 0) {
        await tx.productVariantValue.deleteMany({
          where: { variantId: { in: variantIds } },
        });
        await tx.productVariant.deleteMany({
          where: { id: { in: variantIds } },
        });
      }

      await tx.productMaterial.deleteMany({ where: { productId: numId } });
      await tx.productImage.deleteMany({ where: { productId: numId } });
      return tx.product.delete({ where: { id: numId } });
    });
  }

  /**
   * Duplicate product with images and variants
   */
  async duplicate(id, newSlug, newSku) {
    const numId = Number(id);
    const source = await this.db.product.findUnique({
      where: { id: numId },
      include: {
        images: true,
        variants: { include: { attributeValues: true }, where: { deletedAt: null } },
      },
    });

    if (!source) return null;

    return this.db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: `${source.name} (Copy)`,
          slug: newSlug,
          sku: newSku,
          categoryId: source.categoryId,
          brandId: source.brandId,
          shortDescription: source.shortDescription,
          fullDescription: source.fullDescription,
          costPrice: source.costPrice,
          price: source.price,
          compareAtPrice: source.compareAtPrice,
          discountType: source.discountType,
          discountValue: source.discountValue,
          taxClass: source.taxClass,
          stock: source.stock,
          lowStockAlert: source.lowStockAlert,
          stockStatus: source.stockStatus,
          minimumOrderQuantity: source.minimumOrderQuantity,
          maximumOrderQuantity: source.maximumOrderQuantity,
          weight: source.weight,
          length: source.length,
          width: source.width,
          height: source.height,
          featuredImage: source.featuredImage,
          isFeatured: source.isFeatured,
          isBestSeller: source.isBestSeller,
          isNewArrival: source.isNewArrival,
          isOnSale: source.isOnSale,
          isTrending: source.isTrending,
          isSpecial: source.isSpecial,
          isWeekly: source.isWeekly,
          isFlash: source.isFlash,
          metaTitle: source.metaTitle,
          metaDescription: source.metaDescription,
          metaKeywords: source.metaKeywords,
          warranty: source.warranty,
          tags: source.tags ?? undefined,
          colorway: source.colorway,
          status: "DRAFT",
          images: {
            create: source.images.map((img) => ({ url: img.url, alt: img.alt, sortOrder: img.sortOrder })),
          },
        },
      });

      for (const variant of source.variants) {
        await tx.productVariant.create({
          data: {
            productId: created.id,
            sku: variant.sku ? `${variant.sku}-COPY` : null,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            costPrice: variant.costPrice,
            stockQuantity: variant.stockQuantity,
            lowStockAlert: variant.lowStockAlert,
            weight: variant.weight,
            image: variant.image,
            status: variant.status,
            attributeValues: {
              create: variant.attributeValues.map((av) => ({ attributeValueId: av.attributeValueId })),
            },
          },
        });
      }

      return created;
    });
  }

  /**
   * Restore a soft-deleted product
   */
  async restore(id) {
    return this.db.product.update({
      where: { id: Number(id) },
      data: { deletedAt: null },
    });
  }

  /**
   * Bulk cascade delete products
   */
  async bulkDelete(ids) {
    const numIds = ids.map(Number);
    return this.db.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { productId: { in: numIds } },
        data: { productId: null },
      });
      await tx.cartItem.deleteMany({ where: { productId: { in: numIds } } });
      await tx.wishlistItem.deleteMany({ where: { productId: { in: numIds } } });
      await tx.review.deleteMany({ where: { productId: { in: numIds } } });
      await tx.productRelation.deleteMany({
        where: { OR: [{ productId: { in: numIds } }, { relatedId: { in: numIds } }] },
      });

      const variants = await tx.productVariant.findMany({
        where: { productId: { in: numIds } },
        select: { id: true },
      });
      const variantIds = variants.map((v) => v.id);
      if (variantIds.length > 0) {
        await tx.productVariantValue.deleteMany({
          where: { variantId: { in: variantIds } },
        });
        await tx.productVariant.deleteMany({
          where: { id: { in: variantIds } },
        });
      }

      await tx.productMaterial.deleteMany({ where: { productId: { in: numIds } } });
      await tx.productImage.deleteMany({ where: { productId: { in: numIds } } });
      return tx.product.deleteMany({ where: { id: { in: numIds } } });
    });
  }

  /**
   * Bulk update products
   */
  async bulkUpdate(ids, data) {
    return this.db.product.updateMany({
      where: { id: { in: ids.map(Number) } },
      data,
    });
  }
}
