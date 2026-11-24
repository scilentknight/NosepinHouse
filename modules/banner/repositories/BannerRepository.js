import { prisma } from "@/lib/prisma";

export default class BannerRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findAll() {
    return this.db.homeBannerSlide.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }

  async findById(id) {
    return this.db.homeBannerSlide.findUnique({
      where: { id: Number(id) },
    });
  }

  async findLastBySortOrder() {
    return this.db.homeBannerSlide.findFirst({
      orderBy: { sortOrder: "desc" },
    });
  }

  async create(data) {
    return this.db.homeBannerSlide.create({ data });
  }

  async update(id, data) {
    return this.db.homeBannerSlide.update({
      where: { id: Number(id) },
      data,
    });
  }

  async delete(id) {
    return this.db.homeBannerSlide.delete({
      where: { id: Number(id) },
    });
  }

  async reorder(items) {
    return this.db.$transaction(
      items.map((item) =>
        this.db.homeBannerSlide.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
  }
}
