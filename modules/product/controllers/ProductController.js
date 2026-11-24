import { NextResponse } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export default class ProductController {
  constructor(productService) {
    this.productService = productService;
  }

  /**
   * GET /api/products
   */
  async getStorefrontProducts(request) {
    try {
      const { searchParams } = new URL(request.url);
      const ids = searchParams.get("ids");

      if (ids) {
        const idList = ids
          .split(",")
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value));

        if (idList.length === 0) {
          return ok([]);
        }

        const data = await this.productService.getProductsByIds(idList);
        return ok(data);
      }

      const result = await this.productService.getStorefrontProducts(searchParams);

      return NextResponse.json({
        success: true,
        message: "Products retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * GET /api/products/[slug]
   */
  async getStorefrontProductBySlug(request, { params }) {
    try {
      const resolvedParams = await params;
      const { slug } = resolvedParams;
      const data = await this.productService.getStorefrontProductBySlug(slug);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/products/pricing
   */
  async calculateCustomerPricing(request) {
    try {
      const body = await request.json();
      const result = await this.productService.calculateJewelleryPricing(body);
      return ok(result);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * GET /api/admin/products
   */
  async getAdminProducts(request) {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const data = await this.productService.getAdminProducts(searchParams);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * GET /api/admin/products/[id]
   */
  async getAdminProductById(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const data = await this.productService.getAdminProductById(id);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/products
   */
  async createProduct(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const product = await this.productService.createProduct(body);
      return ok(product, "Product created");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * PUT /api/admin/products/[id]
   */
  async updateProduct(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const product = await this.productService.updateProduct(id, body);
      return ok(product, "Product updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * DELETE /api/admin/products/[id]
   */
  async deleteProduct(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const name = await this.productService.deleteProduct(id);
      return ok(null, `Product "${name}" deleted successfully`);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * DELETE /api/admin/products/[id]/permanent
   */
  async permanentDeleteProduct(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.productService.deleteProduct(id);
      return ok(null, "Product permanently deleted");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/products/[id]/duplicate
   */
  async duplicateProduct(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const duplicate = await this.productService.duplicateProduct(id);
      return ok(duplicate, "Product duplicated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/products/[id]/restore
   */
  async restoreProduct(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const product = await this.productService.restoreProduct(id);
      return ok(product, "Product restored");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/products/bulk
   */
  async handleBulkAction(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      await this.productService.handleBulkAction(body);
      return ok(null, "Bulk action applied");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/admin/products/pricing
   */
  async calculateAdminPricing(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const result = await this.productService.calculateJewelleryPricing(body);
      return ok(result);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
