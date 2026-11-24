import { ok, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export default class AttributeController {
  constructor(attributeService) {
    this.attributeService = attributeService;
  }

  async getAll() {
    try {
      await requireAdmin();
      const attributes = await this.attributeService.getAllAttributes();
      return ok(attributes);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async create(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const attribute = await this.attributeService.createAttribute(body);
      return ok(attribute, "Attribute created");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async update(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const attribute = await this.attributeService.updateAttribute(id, body);
      return ok(attribute, "Attribute updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async delete(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.attributeService.deleteAttribute(id);
      return ok(null, "Attribute deleted");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async createValue(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const value = await this.attributeService.createAttributeValue(id, body);
      return ok(value, "Value added");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateValue(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const value = await this.attributeService.updateAttributeValue(id, body);
      return ok(value, "Value updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteValue(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.attributeService.deleteAttributeValue(id);
      return ok(null, "Value deleted");
    } catch (error) {
      return handleApiError(error);
    }
  }
}
