import AppError from "@/core/errors/AppError";
import { ensureUniqueSlug, slugify } from "@/lib/slug";
import { attributeSchema, attributeValueSchema } from "@/schemas/admin-attribute";
import { prisma } from "@/lib/prisma";

export default class AttributeService {
  constructor(attributeRepository) {
    this.attributeRepository = attributeRepository;
  }

  async getAllAttributes() {
    return this.attributeRepository.findAll();
  }

  async createAttribute(body) {
    const parsed = attributeSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    const slug = await ensureUniqueSlug(prisma.attribute, data.name);

    return this.attributeRepository.create({
      name: data.name,
      slug,
      type: data.type,
      sortOrder: data.sortOrder,
    });
  }

  async updateAttribute(id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.attributeRepository.findById(numId);
    if (!existing) {
      throw new AppError("Attribute not found", 404);
    }

    const parsed = attributeSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    const slug = data.name === existing.name ? existing.slug : await ensureUniqueSlug(prisma.attribute, data.name, numId);

    return this.attributeRepository.update(numId, {
      name: data.name,
      slug,
      type: data.type,
      sortOrder: data.sortOrder,
    });
  }

  async deleteAttribute(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.attributeRepository.findById(numId, true);
    if (!existing) {
      throw new AppError("Attribute not found", 404);
    }

    const inUse = existing.values.some((v) => v._count.variantValues > 0);
    if (inUse) {
      throw new AppError("Cannot delete an attribute whose values are used by existing variants", 400);
    }

    return this.attributeRepository.delete(numId);
  }

  async createAttributeValue(attributeId, body) {
    const numAttributeId = Number(attributeId);
    if (Number.isNaN(numAttributeId)) {
      throw new AppError("Invalid id", 400);
    }

    const attribute = await this.attributeRepository.findById(numAttributeId);
    if (!attribute) {
      throw new AppError("Attribute not found", 404);
    }

    const parsed = attributeValueSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    const existing = await this.attributeRepository.findValueByAttributeAndValue(numAttributeId, data.value);
    if (existing) {
      throw new AppError("This value already exists for this attribute", 400);
    }

    return this.attributeRepository.createValue({
      attributeId: numAttributeId,
      value: data.value,
      slug: slugify(data.value),
      colorHex: data.colorHex ?? null,
      sortOrder: data.sortOrder,
    });
  }

  async updateAttributeValue(id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.attributeRepository.findValueById(numId);
    if (!existing) {
      throw new AppError("Attribute value not found", 404);
    }

    const parsed = attributeValueSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    return this.attributeRepository.updateValue(numId, {
      value: data.value,
      slug: slugify(data.value),
      colorHex: data.colorHex ?? null,
      sortOrder: data.sortOrder,
    });
  }

  async deleteAttributeValue(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.attributeRepository.findValueById(numId, true);
    if (!existing) {
      throw new AppError("Attribute value not found", 404);
    }

    if (existing._count.variantValues > 0) {
      throw new AppError("Cannot delete a value used by existing variants", 400);
    }

    return this.attributeRepository.deleteValue(numId);
  }
}
