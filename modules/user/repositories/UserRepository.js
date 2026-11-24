import { prisma } from "@/lib/prisma";

const customerSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { orders: true, reviews: true, addresses: true } },
  addresses: {
    orderBy: { isDefault: "desc" },
    take: 5,
    select: {
      id: true,
      fullName: true,
      phone: true,
      line1: true,
      landmark: true,
      wardNo: true,
      addressType: true,
      isDefault: true,
      province: { select: { name: true } },
      district: { select: { name: true } },
      municipality: { select: { name: true } },
    },
  },
  orders: {
    orderBy: { placedAt: "desc" },
    take: 5,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      placedAt: true,
    },
  },
};

const customerListSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { orders: true, reviews: true } },
};

export default class UserRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findById(id, select) {
    return this.db.user.findUnique({
      where: { id: Number(id) },
      ...(select ? { select } : {}),
    });
  }

  async findByEmail(email) {
    return this.db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async update(id, data, select) {
    return this.db.user.update({
      where: { id: Number(id) },
      data,
      ...(select ? { select } : {}),
    });
  }

  async findCustomers({ where, skip, take }) {
    return this.db.user.findMany({
      where,
      select: customerListSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  async countCustomers(where) {
    return this.db.user.count({ where });
  }

  async findCustomerById(id) {
    return this.db.user.findFirst({
      where: { id: Number(id), role: "USER" },
      select: customerSelect,
    });
  }
}
