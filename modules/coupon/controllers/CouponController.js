import { ok, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export default class CouponController {
  constructor(couponService) {
    this.couponService = couponService;
  }

  async validateCoupon(request) {
    try {
      const { code, subtotal } = await request.json();
      const result = await this.couponService.validateCoupon(code, subtotal);
      return ok(result);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getAdminCoupons(request) {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const data = await this.couponService.getAdminCoupons(searchParams);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async createCoupon(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const coupon = await this.couponService.createCoupon(body);
      return ok(coupon, "Coupon created");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getAdminCouponById(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const coupon = await this.couponService.getAdminCouponById(id);
      return ok(coupon);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateCoupon(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const coupon = await this.couponService.updateCoupon(id, body);
      return ok(coupon, "Coupon updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async toggleCouponActive(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const coupon = await this.couponService.toggleCouponActive(id, body?.active);
      return ok(coupon, "Coupon updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteCoupon(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.couponService.deleteCoupon(id);
      return ok(null, "Coupon deleted");
    } catch (error) {
      return handleApiError(error);
    }
  }
}
