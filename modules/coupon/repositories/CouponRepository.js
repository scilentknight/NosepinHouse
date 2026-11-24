import { prisma } from "@/lib/prisma";

export default class CouponRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findByCode(code) {
    return this.db.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  }

  async findById(id) {
    return this.db.coupon.findUnique({
      where: { id: Number(id) },
    });
  }

  async findAdminCoupons({ where, skip, take }) {
    return this.db.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  async countAdminCoupons(where) {
    return this.db.coupon.count({ where });
  }

  async countOrdersUsingCoupon(id) {
    return this.db.order.count({
      where: { couponId: Number(id) },
    });
  }

  async create(data) {
    return this.db.coupon.create({ data });
  }

  async update(id, data) {
    return this.db.coupon.update({
      where: { id: Number(id) },
      data,
    });
  }

  async delete(id) {
    return this.db.coupon.delete({
      where: { id: Number(id) },
    });
  }
}
