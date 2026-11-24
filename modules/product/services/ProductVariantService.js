import AppError from "@/core/errors/AppError";
import { generateVariantSku } from "@/lib/sku";
import {
  variantSchema,
  generateVariantsSchema,
  variantBulkUpdateSchema,
  variantBulkActionSchema,
} from "@/schemas/admin-variant";

function cartesian(groups) {
  return groups.reduce(
    (acc, group) => acc.flatMap((combo) => group.map((value) => [...combo, value])),
    [[]]
  );
}

export default class ProductVariantService {
  constructor(productVariantRepository, productRepository) {
    this.productVariantRepository = productVariantRepository;
    this.productRepository = productRepository;
  }

  async getVariantsByProductId(productId, trashed = false) {
    const numId = Number(productId);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid product id", 400);
    }

    const variants = await this.productVariantRepository.findByProductId(numId, trashed);

    return variants.map((v) => ({
      ...v,
      price: v.price ? Number(v.price) : null,
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      costPrice: v.costPrice ? Number(v.costPrice) : null,
      weight: v.weight ? Number(v.weight) : null,
      attributeValueIds: v.attributeValues.map((av) => av.attributeValueId),
      label: v.attributeValues.map((av) => av.attributeValue.value).join(" / "),
    }));
  }

  async createVariant(productId, body) {
    const numId = Number(productId);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid product id", 400);
    }

    const product = await this.productRepository.findById(numId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const parsed = variantSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    return this.productVariantRepository.create(numId, parsed.data);
  }

  async generateVariants(productId, body) {
    const numId = Number(productId);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid product id", 400);
    }

    const product = await this.productRepository.findById(numId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const parsed = generateVariantsSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const { attributeValueGroups } = parsed.data;
    const combinations = cartesian(attributeValueGroups);
    const allValueIds = Array.from(new Set(attributeValueGroups.flat()));

    const values = await this.productVariantRepository.findAttributeValuesByIds(allValueIds);
    const valueById = new Map(values.map((v) => [v.id, v]));

    const existingVariants = await this.productVariantRepository.findExistingActiveVariants(numId);
    const existingKeys = new Set(
      existingVariants.map((v) =>
        v.attributeValues.map((av) => av.attributeValueId).sort().join("|")
      )
    );

    let created = 0;
    let skipped = 0;

    for (const combo of combinations) {
      const key = [...combo].sort().join("|");
      if (existingKeys.has(key)) {
        skipped += 1;
        continue;
      }

      const label = combo.map((valueId) => valueById.get(valueId)?.value ?? "").join("-");
      await this.productVariantRepository.createGeneratedVariant({
        productId: numId,
        sku: generateVariantSku(product.sku, label),
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        costPrice: product.costPrice,
        stockQuantity: 0,
        status: "ACTIVE",
        attributeValues: {
          create: combo.map((attributeValueId) => ({ attributeValueId })),
        },
      });

      existingKeys.add(key);
      created += 1;
    }

    return { created, skipped };
  }

  async bulkUpdateOrAction(productId, body) {
    const numProductId = Number(productId);
    if (Number.isNaN(numProductId)) {
      throw new AppError("Invalid product id", 400);
    }

    if (body.action) {
      const parsed = variantBulkActionSchema.safeParse(body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
      }

      const { ids, action } = parsed.data;
      if (action === "delete") {
        await this.productVariantRepository.bulkSoftDelete(ids, numProductId);
      } else {
        await this.productVariantRepository.bulkRestore(ids, numProductId);
      }
      return { message: "Bulk action applied" };
    }

    const parsed = variantBulkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const { ids, price, stockQuantity, status } = parsed.data;
    await this.productVariantRepository.bulkUpdate(ids, numProductId, {
      ...(price !== undefined ? { price } : {}),
      ...(stockQuantity !== undefined ? { stockQuantity } : {}),
      ...(status !== undefined ? { status } : {}),
    });

    return { message: "Variants updated" };
  }

  async updateVariant(id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid variant id", 400);
    }

    const existing = await this.productVariantRepository.findById(numId);
    if (!existing) {
      throw new AppError("Variant not found", 404);
    }

    const parsed = variantSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    return this.productVariantRepository.update(numId, parsed.data);
  }

  async deleteVariant(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid variant id", 400);
    }

    const existing = await this.productVariantRepository.findById(numId);
    if (!existing) {
      throw new AppError("Variant not found", 404);
    }

    return this.productVariantRepository.softDelete(numId);
  }

  async restoreVariant(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid variant id", 400);
    }

    const existing = await this.productVariantRepository.findById(numId);
    if (!existing) {
      throw new AppError("Variant not found", 404);
    }

    return this.productVariantRepository.restore(numId);
  }
}
