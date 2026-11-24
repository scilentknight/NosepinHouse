import { ok, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export default class MaterialController {
  constructor(materialService) {
    this.materialService = materialService;
  }

  async getMaterials() {
    try {
      await requireAdmin();
      const materials = await this.materialService.getMaterials();
      return ok(materials);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getMaterialById(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const material = await this.materialService.getMaterialById(id);
      return ok(material);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async createMaterial(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const material = await this.materialService.createMaterial(body);
      return ok(material, "Material created successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateMaterial(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const material = await this.materialService.updateMaterial(id, body);
      return ok(material, "Material updated successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteMaterial(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const name = await this.materialService.deleteMaterial(id);
      return ok({ id }, `Material "${name}" deleted successfully`);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getMaterialRates(request) {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const data = await this.materialService.getMaterialRates(searchParams);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async createBaseRate(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const { data, message } = await this.materialService.createBaseRate(body);
      return ok(data, message);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
