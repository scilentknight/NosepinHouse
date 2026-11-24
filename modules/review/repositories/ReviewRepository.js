import { prisma } from "@/lib/prisma";

export default class ReviewRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findOrderItemWithOrder(orderItemId) {
    return this.db.orderItem.findUnique({
      where: { id: Number(orderItemId) },
      include: { order: true },
    });
  }

  async createReview(data) {
    return this.db.review.create({
      data,
    });
  }

  async findAdminReviews({ where, skip, take }) {
    return this.db.review.findMany({
      where,
      include: {
        product: { select: { name: true, slug: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  async countAdminReviews(where) {
    return this.db.review.count({ where });
  }

  async findById(id) {
    return this.db.review.findUnique({
      where: { id: Number(id) },
    });
  }

  async updateReview(id, data) {
    return this.db.review.update({
      where: { id: Number(id) },
      data,
      include: {
        product: { select: { name: true, slug: true } },
        user: { select: { name: true, email: true } },
      },
    });
  }

  async deleteReview(id) {
    return this.db.review.delete({
      where: { id: Number(id) },
    });
  }
}
