import { prisma } from "@/lib/prisma";

export default class BrandRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findAdminBrands({ where, orderBy = [{ sortOrder: "asc" }, { name: "asc" }], skip, take }) {
    return this.db.brand.findMany({
      where,
      orderBy,
      include: { _count: { select: { products: true } } },
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    });
  }

  async countAdminBrands(where) {
    return this.db.brand.count({ where });
  }

  async findById(id, includeCounts = false) {
    return this.db.brand.findUnique({
      where: { id: Number(id) },
      ...(includeCounts ? { include: { _count: { select: { products: true } } } } : {}),
    });
  }

  async create(data) {
    return this.db.brand.create({ data });
  }

  async update(id, data) {
    return this.db.brand.update({
      where: { id: Number(id) },
      data,
    });
  }

  async softDelete(id) {
    return this.db.brand.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });
  }

  async permanentDelete(id) {
    return this.db.brand.delete({
      where: { id: Number(id) },
    });
  }

  async restore(id) {
    return this.db.brand.update({
      where: { id: Number(id) },
      data: { deletedAt: null },
    });
  }

  async bulkUpdate(ids, data) {
    return this.db.brand.updateMany({
      where: { id: { in: ids.map(Number) } },
      data,
    });
  }
}
