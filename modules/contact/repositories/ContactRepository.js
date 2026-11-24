import { prisma } from "@/lib/prisma";

export default class ContactRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findMessages({ where, skip, take }) {
    return this.db.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  async countMessages(where) {
    return this.db.contactMessage.count({ where });
  }

  async findById(id) {
    return this.db.contactMessage.findUnique({
      where: { id: Number(id) },
    });
  }

  async create(data) {
    return this.db.contactMessage.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id, data) {
    return this.db.contactMessage.update({
      where: { id: Number(id) },
      data,
    });
  }

  async delete(id) {
    return this.db.contactMessage.delete({
      where: { id: Number(id) },
    });
  }
}
