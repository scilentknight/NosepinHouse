import { prisma } from "@/lib/prisma";

const addressInclude = { province: true, district: true, municipality: true };

export default class AddressRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findUserAddresses(userId) {
    return this.db.address.findMany({
      where: { userId: Number(userId) },
      include: addressInclude,
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  async findById(id) {
    return this.db.address.findUnique({
      where: { id: Number(id) },
    });
  }

  async countUserAddresses(userId) {
    return this.db.address.count({
      where: { userId: Number(userId) },
    });
  }

  async clearUserDefaults(userId, excludeId = null) {
    return this.db.address.updateMany({
      where: {
        userId: Number(userId),
        ...(excludeId ? { id: { not: Number(excludeId) } } : {}),
      },
      data: { isDefault: false },
    });
  }

  async create(data) {
    return this.db.address.create({
      data,
      include: addressInclude,
    });
  }

  async update(id, data) {
    return this.db.address.update({
      where: { id: Number(id) },
      data,
      include: addressInclude,
    });
  }

  async delete(id) {
    return this.db.address.delete({
      where: { id: Number(id) },
    });
  }

  async findAddressBookTree() {
    return this.db.addressBook.findMany({
      where: { level: "PROVINCE" },
      orderBy: { id: "asc" },
      include: {
        children: {
          orderBy: { id: "asc" },
          include: { children: { orderBy: { id: "asc" } } },
        },
      },
    });
  }
}
