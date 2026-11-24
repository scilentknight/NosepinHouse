import { prisma } from "@/lib/prisma";

export default class CategoryRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findActiveWithProductCount() {
    return this.db.category.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                status: "PUBLISHED",
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async findAdminCategories({ where, orderBy = [{ sortOrder: "asc" }, { name: "asc" }], skip, take, includeParent = false }) {
    return this.db.category.findMany({
      where,
      orderBy,
      include: {
        ...(includeParent ? { parent: { select: { id: true, name: true } } } : {}),
        _count: { select: { products: true, children: true } },
      },
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    });
  }

  async countAdminCategories(where) {
    return this.db.category.count({ where });
  }

  async findById(id, includeCounts = false) {
    return this.db.category.findUnique({
      where: { id: Number(id) },
      include: {
        parent: { select: { id: true, name: true } },
        ...(includeCounts ? { _count: { select: { products: true, children: true } } } : {}),
      },
    });
  }

  async create(data) {
    return this.db.category.create({ data });
  }

  async update(id, data) {
    return this.db.category.update({
      where: { id: Number(id) },
      data,
    });
  }

  async softDelete(id) {
    return this.db.category.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });
  }

  async permanentDelete(id) {
    return this.db.category.delete({
      where: { id: Number(id) },
    });
  }

  async restore(id) {
    return this.db.category.update({
      where: { id: Number(id) },
      data: { deletedAt: null },
    });
  }

  async bulkUpdate(ids, data) {
    return this.db.category.updateMany({
      where: { id: { in: ids.map(Number) } },
      data,
    });
  }

  async reorder(items) {
    return this.db.$transaction(
      items.map((item) =>
        this.db.category.update({
          where: { id: item.id },
          data: {
            sortOrder: item.sortOrder,
            ...(item.parentCategoryId !== undefined ? { parentCategoryId: item.parentCategoryId || null } : {}),
          },
        })
      )
    );
  }
}
