import AppError from "@/core/errors/AppError";
import { ensureUniqueSlug } from "@/lib/slug";
import { parsePagination } from "@/lib/admin-query";
import { brandSchema, brandBulkActionSchema } from "@/schemas/admin-brand";
import { prisma } from "@/lib/prisma";

export default class BrandService {
  constructor(brandRepository) {
    this.brandRepository = brandRepository;
  }

  async getAdminBrands(searchParams) {
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const trashed = searchParams.get("trashed") === "true";
    const { page, pageSize, skip } = parsePagination(searchParams);

    const where = {
      deletedAt: trashed ? { not: null } : null,
      ...(status === "ACTIVE" || status === "INACTIVE" ? { status } : {}),
      ...(search ? { name: { contains: search } } : {}),
    };

    const [brands, total] = await Promise.all([
      this.brandRepository.findAdminBrands({
        where,
        skip,
        take: pageSize,
      }),
      this.brandRepository.countAdminBrands(where),
    ]);

    return { brands, total, page, pageSize };
  }

  async getAdminBrandById(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const brand = await this.brandRepository.findById(numId);
    if (!brand) {
      throw new AppError("Brand not found", 404);
    }

    return brand;
  }

  async createBrand(body) {
    const parsed = brandSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    const slug = await ensureUniqueSlug(prisma.brand, data.slug || data.name);

    return this.brandRepository.create({
      name: data.name,
      slug,
      logo: data.logo || null,
      banner: data.banner || null,
      description: data.description || null,
      websiteUrl: data.websiteUrl || null,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      metaKeywords: data.metaKeywords || null,
      sortOrder: data.sortOrder,
      isFeatured: data.isFeatured,
      status: data.status,
    });
  }

  async updateBrand(id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.brandRepository.findById(numId);
    if (!existing) {
      throw new AppError("Brand not found", 404);
    }

    const parsed = brandSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    const desiredSlug = data.slug?.trim() || data.name;
    const slug = desiredSlug === existing.slug ? existing.slug : await ensureUniqueSlug(prisma.brand, desiredSlug, numId);

    return this.brandRepository.update(numId, {
      name: data.name,
      slug,
      logo: data.logo || null,
      banner: data.banner || null,
      description: data.description || null,
      websiteUrl: data.websiteUrl || null,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      metaKeywords: data.metaKeywords || null,
      sortOrder: data.sortOrder,
      isFeatured: data.isFeatured,
      status: data.status,
    });
  }

  async deleteBrand(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.brandRepository.findById(numId);
    if (!existing) {
      throw new AppError("Brand not found", 404);
    }

    return this.brandRepository.softDelete(numId);
  }

  async permanentDeleteBrand(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.brandRepository.findById(numId, true);
    if (!existing) {
      throw new AppError("Brand not found", 404);
    }
    if (!existing.deletedAt) {
      throw new AppError("Brand must be trashed before it can be permanently deleted", 400);
    }
    if (existing._count?.products > 0) {
      throw new AppError("Cannot permanently delete a brand that still has products", 400);
    }

    return this.brandRepository.permanentDelete(numId);
  }

  async restoreBrand(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.brandRepository.findById(numId);
    if (!existing) {
      throw new AppError("Brand not found", 404);
    }

    return this.brandRepository.restore(numId);
  }

  async handleBulkAction(body) {
    const parsed = brandBulkActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const { ids, action } = parsed.data;
    switch (action) {
      case "delete":
        await this.brandRepository.bulkUpdate(ids, { deletedAt: new Date() });
        break;
      case "enable":
        await this.brandRepository.bulkUpdate(ids, { status: "ACTIVE" });
        break;
      case "disable":
        await this.brandRepository.bulkUpdate(ids, { status: "INACTIVE" });
        break;
      case "restore":
        await this.brandRepository.bulkUpdate(ids, { deletedAt: null });
        break;
      default:
        throw new AppError("Unsupported bulk action", 400);
    }
  }
}
