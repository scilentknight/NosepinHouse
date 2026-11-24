import { ok, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export default class CategoryController {
  constructor(categoryService) {
    this.categoryService = categoryService;
  }

  /**
   * GET /api/categories (Storefront)
   */
  async getStorefrontCategories() {
    try {
      const data = await this.categoryService.getStorefrontCategories();
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * GET /api/admin/categories
   */
  async getAdminCategories(request) {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const data = await this.categoryService.getAdminCategories(searchParams);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/categories
   */
  async createCategory(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const category = await this.categoryService.createCategory(body);
      return ok(category, "Category created");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * GET /api/admin/categories/[id]
   */
  async getAdminCategoryById(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const category = await this.categoryService.getAdminCategoryById(id);
      return ok(category);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * PUT /api/admin/categories/[id]
   */
  async updateCategory(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const category = await this.categoryService.updateCategory(id, body);
      return ok(category, "Category updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * DELETE /api/admin/categories/[id]
   */
  async deleteCategory(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.categoryService.deleteCategory(id);
      return ok(null, "Category moved to trash");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * DELETE /api/admin/categories/[id]/permanent
   */
  async permanentDeleteCategory(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.categoryService.permanentDeleteCategory(id);
      return ok(null, "Category permanently deleted");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/categories/[id]/restore
   */
  async restoreCategory(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const category = await this.categoryService.restoreCategory(id);
      return ok(category, "Category restored");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/categories/bulk
   */
  async handleBulkAction(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      await this.categoryService.handleBulkAction(body);
      return ok(null, "Bulk action applied");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/categories/reorder
   */
  async reorderCategories(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      await this.categoryService.reorderCategories(body);
      return ok(null, "Order updated");
    } catch (error) {
      return handleApiError(error);
    }
  }
}
