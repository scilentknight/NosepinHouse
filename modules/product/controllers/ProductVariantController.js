import { ok, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export default class ProductVariantController {
  constructor(productVariantService) {
    this.productVariantService = productVariantService;
  }

  /**
   * GET /api/admin/products/[id]/variants
   */
  async getVariants(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const productId = resolvedParams.id;
      const { searchParams } = new URL(request.url);
      const trashed = searchParams.get("trashed") === "true";

      const data = await this.productVariantService.getVariantsByProductId(productId, trashed);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/products/[id]/variants
   */
  async createVariant(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const productId = resolvedParams.id;
      const body = await request.json();

      const variant = await this.productVariantService.createVariant(productId, body);
      return ok(variant, "Variant created");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/products/[id]/variants/generate
   */
  async generateVariants(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const productId = resolvedParams.id;
      const body = await request.json();

      const { created, skipped } = await this.productVariantService.generateVariants(productId, body);
      return ok(
        { created, skipped },
        `${created} variant(s) generated${skipped ? `, ${skipped} already existed` : ""}`
      );
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/products/[id]/variants/bulk
   */
  async bulkUpdateOrAction(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const productId = resolvedParams.id;
      const body = await request.json();

      const result = await this.productVariantService.bulkUpdateOrAction(productId, body);
      return ok(null, result.message);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * PUT /api/admin/variants/[id]
   */
  async updateVariant(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();

      const variant = await this.productVariantService.updateVariant(id, body);
      return ok(variant, "Variant updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * DELETE /api/admin/variants/[id]
   */
  async deleteVariant(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;

      await this.productVariantService.deleteVariant(id);
      return ok(null, "Variant moved to trash");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/variants/[id]/restore
   */
  async restoreVariant(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;

      const variant = await this.productVariantService.restoreVariant(id);
      return ok(variant, "Variant restored");
    } catch (error) {
      return handleApiError(error);
    }
  }
}
