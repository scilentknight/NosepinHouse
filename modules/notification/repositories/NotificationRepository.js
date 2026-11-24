import { prisma } from "@/lib/prisma";

export default class NotificationRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findUserNotifications(userId, take = 20) {
    return this.db.notification.findMany({
      where: { userId: Number(userId) },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async markAsRead(userId, id = null) {
    return this.db.notification.updateMany({
      where: {
        userId: Number(userId),
        ...(id ? { id: Number(id) } : { read: false }),
      },
      data: { read: true },
    });
  }
}
