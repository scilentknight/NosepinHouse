import { prisma } from "@/lib/prisma";

export default class MaterialRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findActiveMaterials() {
    return this.db.material.findMany({
      where: { isActive: true },
      include: {
        purities: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findPreciousMetals(materialId) {
    return this.db.material.findMany({
      where: {
        isActive: true,
        type: "PRECIOUS_METAL",
        ...(materialId ? { id: materialId } : {}),
      },
      include: {
        purities: {
          where: { isActive: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findById(id) {
    return this.db.material.findUnique({
      where: { id },
      include: {
        purities: {
          orderBy: { name: "asc" },
        },
      },
    });
  }

  async findByCode(code) {
    return this.db.material.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  }

  async findPurityById(id) {
    return this.db.materialPurity.findUnique({
      where: { id },
    });
  }

  async create({ name, code, type, unit, description, purities }) {
    return this.db.material.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        unit,
        description: description?.trim() || null,
        purities: {
          create: purities.map((purity) => ({
            name: purity.name.trim(),
            code: purity.code.trim().toUpperCase(),
            fineness:
              purity.fineness === null || purity.fineness === undefined || purity.fineness === ""
                ? null
                : Number(purity.fineness),
          })),
        },
      },
      include: { purities: true },
    });
  }

  async updateWithPurities(id, { name, code, type, unit, description, isActive, purities }, existingMaterial) {
    return this.db.$transaction(async (tx) => {
      await tx.material.update({
        where: { id },
        data: {
          name: name ? name.trim() : existingMaterial.name,
          code: code ? code.trim().toUpperCase() : existingMaterial.code,
          type: type || existingMaterial.type,
          unit: unit || existingMaterial.unit,
          description: description !== undefined ? description?.trim() || null : existingMaterial.description,
          isActive: typeof isActive === "boolean" ? isActive : existingMaterial.isActive,
        },
      });

      if (Array.isArray(purities)) {
        for (const purity of purities) {
          const pName = purity.name.trim();
          const pCode = purity.code.trim().toUpperCase();
          const pFine =
            purity.fineness === null || purity.fineness === undefined || purity.fineness === ""
              ? null
              : Number(purity.fineness);
          const pActive = typeof purity.isActive === "boolean" ? purity.isActive : true;

          if (purity.id) {
            await tx.materialPurity.update({
              where: { id: purity.id },
              data: {
                name: pName,
                code: pCode,
                fineness: pFine,
                isActive: pActive,
              },
            });
          } else {
            await tx.materialPurity.create({
              data: {
                materialId: id,
                name: pName,
                code: pCode,
                fineness: pFine,
                isActive: pActive,
              },
            });
          }
        }
      }

      return tx.material.findUnique({
        where: { id },
        include: { purities: true },
      });
    });
  }

  async deleteCascade(id) {
    return this.db.$transaction(async (tx) => {
      await tx.productMaterial.updateMany({
        where: { stoneMaterialId: id },
        data: {
          stoneMaterialId: null,
          stoneWeight: null,
          stoneGrossPrice: null,
          stoneDiscountPercent: null,
        },
      });

      await tx.productMaterial.deleteMany({
        where: { materialId: id },
      });

      await tx.materialRate.deleteMany({
        where: { materialId: id },
      });

      await tx.materialPurity.deleteMany({
        where: { materialId: id },
      });

      return tx.material.delete({
        where: { id },
      });
    });
  }

  async findRateHistory(where) {
    return this.db.materialRate.findMany({
      where,
      include: {
        material: true,
        purity: true,
      },
      orderBy: [{ rateDate: "desc" }, { createdAt: "desc" }],
    });
  }

  async clearBaseRates(materialId, rateDate) {
    return this.db.materialRate.updateMany({
      where: {
        materialId,
        rateDate,
      },
      data: {
        isBaseRate: false,
      },
    });
  }

  async upsertBaseRate({ materialId, purityId, rateDate, rate, unit, notes, status }) {
    return this.db.materialRate.upsert({
      where: {
        materialId_purityId_rateDate: {
          materialId,
          purityId,
          rateDate,
        },
      },
      update: {
        rate,
        unit,
        isBaseRate: true,
        notes,
        status,
      },
      create: {
        materialId,
        purityId,
        rateDate,
        rate,
        unit,
        isBaseRate: true,
        notes,
        status,
      },
      include: {
        material: true,
        purity: true,
      },
    });
  }
}
