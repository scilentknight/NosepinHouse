import { ok, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export default class BrandController {
  constructor(brandService) {
    this.brandService = brandService;
  }

  async getAdminBrands(request) {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const data = await this.brandService.getAdminBrands(searchParams);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async createBrand(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const brand = await this.brandService.createBrand(body);
      return ok(brand, "Brand created");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getAdminBrandById(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const brand = await this.brandService.getAdminBrandById(id);
      return ok(brand);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateBrand(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const brand = await this.brandService.updateBrand(id, body);
      return ok(brand, "Brand updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteBrand(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.brandService.deleteBrand(id);
      return ok(null, "Brand moved to trash");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async permanentDeleteBrand(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.brandService.permanentDeleteBrand(id);
      return ok(null, "Brand permanently deleted");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async restoreBrand(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const brand = await this.brandService.restoreBrand(id);
      return ok(brand, "Brand restored");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async handleBulkAction(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      await this.brandService.handleBulkAction(body);
      return ok(null, "Bulk action applied");
    } catch (error) {
      return handleApiError(error);
    }
  }
}
