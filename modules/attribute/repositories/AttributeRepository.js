import { prisma } from "@/lib/prisma";

export default class AttributeRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findAll() {
    return this.db.attribute.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { values: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] } },
    });
  }

  async findById(id, includeUsage = false) {
    return this.db.attribute.findUnique({
      where: { id: Number(id) },
      ...(includeUsage
        ? {
            include: {
              values: {
                include: { _count: { select: { variantValues: true } } },
              },
            },
          }
        : {}),
    });
  }

  async create(data) {
    return this.db.attribute.create({
      data,
      include: { values: true },
    });
  }

  async update(id, data) {
    return this.db.attribute.update({
      where: { id: Number(id) },
      data,
    });
  }

  async delete(id) {
    return this.db.attribute.delete({
      where: { id: Number(id) },
    });
  }

  async findValueById(id, includeUsage = false) {
    return this.db.attributeValue.findUnique({
      where: { id: Number(id) },
      ...(includeUsage ? { include: { _count: { select: { variantValues: true } } } } : {}),
    });
  }

  async findValueByAttributeAndValue(attributeId, value) {
    return this.db.attributeValue.findFirst({
      where: {
        attributeId: Number(attributeId),
        value,
      },
    });
  }

  async createValue(data) {
    return this.db.attributeValue.create({
      data,
    });
  }

  async updateValue(id, data) {
    return this.db.attributeValue.update({
      where: { id: Number(id) },
      data,
    });
  }

  async deleteValue(id) {
    return this.db.attributeValue.delete({
      where: { id: Number(id) },
    });
  }
}
