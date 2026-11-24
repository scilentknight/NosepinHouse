import AppError from "@/core/errors/AppError";
import { recalculateAffectedProducts } from "@/lib/jewellery/recalculate-products";
import { getAllDerivedPurityRatesForMaterial, parseDateOnly } from "@/lib/jewellery/rate-calculator";

export default class MaterialService {
  constructor(materialRepository) {
    this.materialRepository = materialRepository;
  }

  async getMaterials() {
    return this.materialRepository.findActiveMaterials();
  }

  async getMaterialById(id) {
    const material = await this.materialRepository.findById(id);
    if (!material) {
      throw new AppError("Material not found", 404);
    }
    return material;
  }

  async createMaterial(body) {
    const { name, code, type, unit, description, purities } = body;
    if (!name?.trim()) throw new AppError("Material name is required", 400);
    if (!code?.trim()) throw new AppError("Material code is required", 400);
    if (!type) throw new AppError("Material type is required", 400);
    if (!unit) throw new AppError("Material unit is required", 400);
    if (!Array.isArray(purities) || purities.length === 0) {
      throw new AppError("At least one purity or grade is required", 400);
    }

    const existingCode = await this.materialRepository.findByCode(code);
    if (existingCode) {
      throw new AppError(`Material code "${code.trim().toUpperCase()}" already exists`, 400);
    }

    return this.materialRepository.create({
      name,
      code,
      type,
      unit,
      description,
      purities,
    });
  }

  async updateMaterial(id, body) {
    const existing = await this.materialRepository.findById(id);
    if (!existing) {
      throw new AppError("Material not found", 404);
    }

    const { name, code, type, unit, description, isActive, purities } = body;
    if (code && code.trim().toUpperCase() !== existing.code) {
      const codeCheck = await this.materialRepository.findByCode(code);
      if (codeCheck) {
        throw new AppError(`Material code "${code.trim().toUpperCase()}" is already in use`, 400);
      }
    }

    return this.materialRepository.updateWithPurities(
      id,
      { name, code, type, unit, description, isActive, purities },
      existing
    );
  }

  async deleteMaterial(id) {
    const existing = await this.materialRepository.findById(id);
    if (!existing) {
      throw new AppError("Material not found", 404);
    }

    await this.materialRepository.deleteCascade(id);
    return existing.name;
  }

  async getMaterialRates(searchParams) {
    const history = searchParams.get("history") === "true";
    const dateParam = searchParams.get("date");
    const materialId = searchParams.get("materialId");
    const targetDate = parseDateOnly(dateParam);

    if (!history) {
      const materials = await this.materialRepository.findPreciousMetals(materialId);
      return Promise.all(
        materials.map(async (mat) => {
          const derived = await getAllDerivedPurityRatesForMaterial(mat.id, targetDate);
          return {
            materialId: mat.id,
            materialName: mat.name,
            materialCode: mat.code,
            unit: mat.unit,
            type: mat.type,
            purities: mat.purities,
            baseRateRecord: derived.baseRateRecord
              ? {
                  ...derived.baseRateRecord,
                  rate: Number(derived.baseRateRecord.rate),
                }
              : null,
            derivedRates: derived.derivedRates,
          };
        })
      );
    }

    const where = {
      status: "ACTIVE",
      material: { type: "PRECIOUS_METAL" },
      ...(materialId ? { materialId } : {}),
    };

    const historyRates = await this.materialRepository.findRateHistory(where);
    return historyRates.map((r) => ({
      ...r,
      rate: Number(r.rate),
    }));
  }

  async createBaseRate(body) {
    const materialId = body.materialId;
    const purityId = body.purityId;
    const rate = Number(body.rate);
    const notes = body.notes?.trim() || null;
    const status = body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    const rateDate = parseDateOnly(body.rateDate);

    if (!materialId) throw new AppError("Material is required", 400);
    if (!purityId) throw new AppError("Base purity or grade is required", 400);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new AppError("Valid positive base rate is required", 400);
    }

    const material = await this.materialRepository.findById(materialId);
    if (!material) throw new AppError("Material not found", 404);
    if (material.type !== "PRECIOUS_METAL") {
      throw new AppError(
        "Rates can only be configured for precious metals (Gold, Silver, etc.). Non-precious materials (Diamond, Gemstones) use direct gross pricing in products.",
        400
      );
    }

    const purity = await this.materialRepository.findPurityById(purityId);
    if (!purity || purity.materialId !== materialId) {
      throw new AppError("Invalid base purity for this material", 400);
    }

    await this.materialRepository.clearBaseRates(materialId, rateDate);

    const saved = await this.materialRepository.upsertBaseRate({
      materialId,
      purityId,
      rateDate,
      rate,
      unit: material.unit,
      notes,
      status,
    });

    const today = new Date();
    let recalculationResult = {
      total: 0,
      updatedCount: 0,
      skippedCount: 0,
      skippedProductIds: [],
      errors: [],
    };

    if (rateDate <= today) {
      recalculationResult = await recalculateAffectedProducts(materialId, undefined, rateDate);
    }

    const derivedSummary = await getAllDerivedPurityRatesForMaterial(materialId, rateDate);

    return {
      data: {
        rate: {
          ...saved,
          rate: Number(saved.rate),
        },
        derivedRates: derivedSummary.derivedRates,
        recalculatedProducts: recalculationResult,
      },
      message: `Base rate saved for ${material.name} (${purity.name}). Derived rates updated and ${recalculationResult.updatedCount} affected products recalculated.`,
    };
  }
}
