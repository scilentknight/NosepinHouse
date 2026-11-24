import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["PROCESSING", "SHIPPED", "DELIVERED", "RETURNED", "CANCELLED"];
const VALID_PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED"];
const VALID_PAYMENT_METHODS = ["COD", "ONLINE"];

export default class OrderRepository {
  async findManyAdmin({ status, paymentStatus, paymentMethod, from, to, search, page, pageSize }) {
    const where = {
      ...(status && VALID_STATUSES.includes(status) ? { status } : {}),
      ...(paymentStatus && VALID_PAYMENT_STATUSES.includes(paymentStatus) ? { paymentStatus } : {}),
      ...(paymentMethod && VALID_PAYMENT_METHODS.includes(paymentMethod) ? { paymentMethod } : {}),
      ...(from || to
        ? {
            placedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search } },
              { fullName: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: true },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  async findByIdAdmin(id) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        history: { orderBy: { createdAt: "asc" } },
        coupon: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });
  }

  async findByIdWithItems(id) {
    return prisma.order.findUnique({ where: { id }, include: { items: true } });
  }

  async findByIdForUser(id, userId) {
    return prisma.order.findFirst({ where: { id, userId } });
  }

  async findByIdForUserWithItems(id, userId) {
    return prisma.order.findFirst({ where: { id, userId }, include: { items: true } });
  }

  async findByOrderNumber(orderNumber) {
    return prisma.order.findUnique({ where: { orderNumber } });
  }

  async findManyForUser(userId, status) {
    return prisma.order.findMany({
      where: {
        userId,
        ...(status && VALID_STATUSES.includes(status) ? { status: status } : {}),
      },
      include: {
        items: {
          include: {
            reviews: { where: { userId } },
            product: { select: { slug: true, deletedAt: true } },
          },
        },
        history: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { placedAt: "desc" },
    });
  }

  async updateStatus(id, data) {
    return prisma.order.update({ where: { id }, data });
  }

  async findAdminUsers() {
    return prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  }

  async updateStatusWithHistory(id, data, historyNote, restockItems) {
    return prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data });
      await tx.orderStatusHistory.create({
        data: { orderId: id, status: data.status, note: historyNote ?? null },
      });
      if (restockItems && restockItems.length > 0) {
        for (const item of restockItems) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockQuantity: { increment: item.quantity } },
            });
          } else if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }
    });
  }

  async processReturn(id, approved, note, refunded) {
    return prisma.$transaction(async (tx) => {
      if (approved) {
        await tx.order.update({
          where: { id },
          data: { status: "RETURNED", refunded },
        });
        await tx.orderStatusHistory.create({ data: { orderId: id, status: "RETURNED", note } });
      } else {
        await tx.order.update({
          where: { id },
          data: { returnRequested: false },
        });
        await tx.orderStatusHistory.create({ data: { orderId: id, status: "DELIVERED", note } });
      }
    });
  }

  async cancelOrder(id, paymentStatus, items, note) {
    return prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: "CANCELLED", refunded: paymentStatus === "PAID" },
      });
      for (const item of items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        } else if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      await tx.orderStatusHistory.create({
        data: { orderId: id, status: "CANCELLED", note },
      });
    });
  }

  async requestReturn(id, reason) {
    return prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { returnRequested: true, returnReason: reason },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: id, status: "DELIVERED", note: `Return requested: ${reason}` },
      });
    });
  }
}
