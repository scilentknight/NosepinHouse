import { prisma } from "@/lib/prisma";

export default class DashboardRepository {
  async getStats({ rangeStart, prevRangeStart, todayStart, tomorrow, yesterdayStart }) {
    const notCancelled = { status: { not: "CANCELLED" } };

    return Promise.all([
      prisma.order.aggregate({ where: notCancelled, _sum: { total: true } }),
      prisma.order.count({ where: notCancelled }),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { role: "USER", createdAt: { gte: rangeStart } } }),
      prisma.product.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      prisma.product.count({ where: { status: "DRAFT", deletedAt: null } }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.order.groupBy({
        by: ["paymentMethod"],
        where: { placedAt: { gte: rangeStart }, ...notCancelled },
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.review.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { returnRequested: true, refunded: false, status: { not: "CANCELLED" } } }),
      prisma.order.findMany({
        where: { status: "PROCESSING" },
        orderBy: { placedAt: "asc" },
        take: 8,
        select: { id: true, orderNumber: true, fullName: true, total: true, paymentMethod: true, paymentStatus: true, placedAt: true, _count: { select: { items: true } } },
      }),
      prisma.order.findMany({
        orderBy: { placedAt: "desc" },
        take: 8,
        select: { id: true, orderNumber: true, fullName: true, status: true, paymentMethod: true, paymentStatus: true, total: true, placedAt: true, _count: { select: { items: true } } },
      }),
      prisma.order.findMany({
        where: { placedAt: { gte: rangeStart }, ...notCancelled },
        select: { placedAt: true, total: true, paymentMethod: true, paymentStatus: true },
      }),
      prisma.order.findMany({
        where: { placedAt: { gte: prevRangeStart, lt: rangeStart }, ...notCancelled },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { placedAt: { gte: todayStart, lt: tomorrow }, ...notCancelled },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { placedAt: { gte: yesterdayStart, lt: todayStart }, ...notCancelled },
        select: { total: true },
      }),
      prisma.orderItem.findMany({
        where: { order: { placedAt: { gte: rangeStart }, ...notCancelled } },
        select: { name: true, quantity: true, price: true, productId: true, image: true, product: { select: { slug: true, featuredImage: true, category: { select: { name: true } } } } },
      }),
      prisma.wishlistItem.groupBy({ by: ["productId"], _count: { _all: true }, orderBy: { _count: { productId: "desc" } }, take: 5 }),
      prisma.product.findMany({
        where: { deletedAt: null, status: "PUBLISHED", OR: [{ stockStatus: "OUT_OF_STOCK" }, { stock: { lte: 30 } }] },
        select: { id: true, name: true, sku: true, slug: true, stock: true, lowStockAlert: true, featuredImage: true, stockStatus: true },
        orderBy: { stock: "asc" },
        take: 80,
      }),
      prisma.order.count({ where: { paymentMethod: "COD", paymentStatus: "PENDING", status: { notIn: ["CANCELLED", "RETURNED"] } } }),
    ]);
  }

  async findProductsByIds(ids) {
    return prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true, featuredImage: true },
    });
  }
}
