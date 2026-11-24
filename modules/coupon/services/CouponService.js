import AppError from "@/core/errors/AppError";
import { parsePagination } from "@/lib/admin-query";
import { couponSchema } from "@/schemas/admin-coupon";

function serializeCoupon(coupon) {
  if (!coupon) return null;
  return {
    ...coupon,
    value: Number(coupon.value),
    minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
  };
}

export default class CouponService {
  constructor(couponRepository) {
    this.couponRepository = couponRepository;
  }

  async validateCoupon(code, subtotal) {
    if (!code) throw new AppError("Coupon code is required", 400);

    const coupon = await this.couponRepository.findByCode(code);
    if (!coupon || !coupon.active) {
      throw new AppError("Invalid or expired coupon code", 404);
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new AppError("This coupon has expired", 404);
    }
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      throw new AppError(
        `Minimum order of Rs. ${Number(coupon.minOrderAmount)} required for this coupon`,
        400
      );
    }

    const discount =
      coupon.type === "PERCENT"
        ? Math.round(subtotal * (Number(coupon.value) / 100) * 100) / 100
        : Number(coupon.value);

    return {
      code: coupon.code,
      discount: Math.min(discount, subtotal),
    };
  }

  async getAdminCoupons(searchParams) {
    const search = searchParams.get("search")?.trim();
    const active = searchParams.get("active");
    const { page, pageSize, skip } = parsePagination(searchParams);

    const where = {
      ...(active === "true" || active === "false" ? { active: active === "true" } : {}),
      ...(search ? { code: { contains: search } } : {}),
    };

    const [coupons, total] = await Promise.all([
      this.couponRepository.findAdminCoupons({ where, skip, take: pageSize }),
      this.couponRepository.countAdminCoupons(where),
    ]);

    return { coupons: coupons.map(serializeCoupon), total, page, pageSize };
  }

  async getAdminCouponById(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid id", 400);

    const coupon = await this.couponRepository.findById(numId);
    if (!coupon) throw new AppError("Coupon not found", 404);

    return serializeCoupon(coupon);
  }

  async createCoupon(body) {
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    const existing = await this.couponRepository.findByCode(data.code);
    if (existing) {
      throw new AppError("This coupon code already exists", 400);
    }

    const coupon = await this.couponRepository.create({
      code: data.code,
      type: data.type,
      value: data.value,
      minOrderAmount: data.minOrderAmount ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      active: data.active,
    });

    return serializeCoupon(coupon);
  }

  async updateCoupon(id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid id", 400);

    const existing = await this.couponRepository.findById(numId);
    if (!existing) throw new AppError("Coupon not found", 404);

    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    if (data.code !== existing.code) {
      const codeTaken = await this.couponRepository.findByCode(data.code);
      if (codeTaken) throw new AppError("This coupon code already exists", 400);
    }

    const coupon = await this.couponRepository.update(numId, {
      code: data.code,
      type: data.type,
      value: data.value,
      minOrderAmount: data.minOrderAmount ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      active: data.active,
    });

    return serializeCoupon(coupon);
  }

  async toggleCouponActive(id, active) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid id", 400);

    const existing = await this.couponRepository.findById(numId);
    if (!existing) throw new AppError("Coupon not found", 404);

    if (typeof active !== "boolean") {
      throw new AppError("Invalid request", 400);
    }

    const coupon = await this.couponRepository.update(numId, { active });
    return serializeCoupon(coupon);
  }

  async deleteCoupon(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid id", 400);

    const existing = await this.couponRepository.findById(numId);
    if (!existing) throw new AppError("Coupon not found", 404);

    const usageCount = await this.couponRepository.countOrdersUsingCoupon(numId);
    if (usageCount > 0) {
      throw new AppError(
        "Cannot delete a coupon that has been used by existing orders — deactivate it instead",
        400
      );
    }

    return this.couponRepository.delete(numId);
  }
}
