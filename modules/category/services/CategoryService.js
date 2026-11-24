import AppError from "@/core/errors/AppError";
import { ensureUniqueSlug } from "@/lib/slug";
import { parsePagination } from "@/lib/admin-query";
import { categorySchema, categoryBulkActionSchema, categoryReorderSchema } from "@/schemas/admin-category";
import { prisma } from "@/lib/prisma";

export default class CategoryService {
  constructor(categoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  /**
   * Storefront hierarchical category tree with active/published products check
   */
  async getStorefrontCategories() {
    const categories = await this.categoryRepository.findActiveWithProductCount();

    const categoryMap = new Map();
    for (const category of categories) {
      categoryMap.set(category.id, {
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image,
        productCount: category._count.products,
        parentCategoryId: category.parentCategoryId,
        children: [],
      });
    }

    const rootCategories = [];
    for (const category of categories) {
      const currentCategory = categoryMap.get(category.id);
      if (!currentCategory) continue;

      if (category.parentCategoryId === null) {
        rootCategories.push(currentCategory);
      } else {
        const parentCategory = categoryMap.get(category.parentCategoryId);
        if (parentCategory) {
          parentCategory.children.push(currentCategory);
        }
      }
    }

    function filterCategories(items) {
      return items
        .map((category) => {
          const filteredChildren = filterCategories(category.children);
          return {
            ...category,
            children: filteredChildren,
          };
        })
        .filter((category) => category.productCount > 0 || category.children.length > 0);
    }

    return filterCategories(rootCategories);
  }

  /**
   * Admin categories listing with tree or pagination
   */
  async getAdminCategories(searchParams) {
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const parentCategoryId = searchParams.get("parentCategoryId");
    const trashed = searchParams.get("trashed") === "true";
    const tree = searchParams.get("tree") === "true";

    const where = {
      deletedAt: trashed ? { not: null } : null,
      ...(status === "ACTIVE" || status === "INACTIVE" ? { status } : {}),
      ...(parentCategoryId === "root"
        ? { parentCategoryId: null }
        : parentCategoryId
        ? { parentCategoryId: Number(parentCategoryId) }
        : {}),
      ...(search ? { name: { contains: search } } : {}),
    };

    if (tree) {
      const categories = await this.categoryRepository.findAdminCategories({
        where,
        includeParent: false,
      });
      return { categories, total: categories.length, page: 1, pageSize: categories.length };
    }

    const { page, pageSize, skip } = parsePagination(searchParams);
    const [categories, total] = await Promise.all([
      this.categoryRepository.findAdminCategories({
        where,
        skip,
        take: pageSize,
        includeParent: true,
      }),
      this.categoryRepository.countAdminCategories(where),
    ]);

    return { categories, total, page, pageSize };
  }

  async getAdminCategoryById(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const category = await this.categoryRepository.findById(numId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    return category;
  }

  async createCategory(body) {
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    const slug = await ensureUniqueSlug(prisma.category, data.slug || data.name);

    return this.categoryRepository.create({
      name: data.name,
      slug,
      parentCategoryId: data.parentCategoryId || null,
      description: data.description || null,
      image: data.image || null,
      bannerImage: data.bannerImage || null,
      icon: data.icon || null,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      metaKeywords: data.metaKeywords || null,
      sortOrder: data.sortOrder,
      isFeatured: data.isFeatured,
      status: data.status,
    });
  }

  async updateCategory(id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.categoryRepository.findById(numId);
    if (!existing) {
      throw new AppError("Category not found", 404);
    }

    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    if (data.parentCategoryId === numId) {
      throw new AppError("A category cannot be its own parent", 400);
    }

    const desiredSlug = data.slug?.trim() || data.name;
    const slug = desiredSlug === existing.slug ? existing.slug : await ensureUniqueSlug(prisma.category, desiredSlug, numId);

    return this.categoryRepository.update(numId, {
      name: data.name,
      slug,
      parentCategoryId: data.parentCategoryId || null,
      description: data.description || null,
      image: data.image || null,
      bannerImage: data.bannerImage || null,
      icon: data.icon || null,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      metaKeywords: data.metaKeywords || null,
      sortOrder: data.sortOrder,
      isFeatured: data.isFeatured,
      status: data.status,
    });
  }

  async deleteCategory(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.categoryRepository.findById(numId);
    if (!existing) {
      throw new AppError("Category not found", 404);
    }

    return this.categoryRepository.softDelete(numId);
  }

  async permanentDeleteCategory(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.categoryRepository.findById(numId, true);
    if (!existing) {
      throw new AppError("Category not found", 404);
    }
    if (!existing.deletedAt) {
      throw new AppError("Category must be trashed before it can be permanently deleted", 400);
    }
    if (existing._count?.products > 0) {
      throw new AppError("Cannot permanently delete a category that still has products", 400);
    }
    if (existing._count?.children > 0) {
      throw new AppError("Cannot permanently delete a category that still has subcategories", 400);
    }

    return this.categoryRepository.permanentDelete(numId);
  }

  async restoreCategory(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid id", 400);
    }

    const existing = await this.categoryRepository.findById(numId);
    if (!existing) {
      throw new AppError("Category not found", 404);
    }

    return this.categoryRepository.restore(numId);
  }

  async handleBulkAction(body) {
    const parsed = categoryBulkActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const { ids, action } = parsed.data;
    switch (action) {
      case "delete":
        await this.categoryRepository.bulkUpdate(ids, { deletedAt: new Date() });
        break;
      case "enable":
        await this.categoryRepository.bulkUpdate(ids, { status: "ACTIVE" });
        break;
      case "disable":
        await this.categoryRepository.bulkUpdate(ids, { status: "INACTIVE" });
        break;
      case "restore":
        await this.categoryRepository.bulkUpdate(ids, { deletedAt: null });
        break;
      default:
        throw new AppError("Unsupported bulk action", 400);
    }
  }

  async reorderCategories(body) {
    const parsed = categoryReorderSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    return this.categoryRepository.reorder(parsed.data.items);
  }
}
