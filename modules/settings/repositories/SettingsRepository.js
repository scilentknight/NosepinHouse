import { prisma } from "@/lib/prisma";
import {
  getPaymentSettings,
  updatePaymentSettings,
  getEmailSettings,
  updateEmailSettings,
  getInvoiceSettings,
  updateInvoiceSettings,
} from "@/lib/settings";

export default class SettingsRepository {
  // ── Shipping Zones ──────────────────────────────────────
  async findAllShippingZones() {
    return prisma.shippingZone.findMany({
      orderBy: [{ isDefault: "asc" }, { country: "asc" }],
    });
  }

  async findShippingZoneById(id) {
    return prisma.shippingZone.findUnique({ where: { id } });
  }

  async findShippingZoneByCountry(country) {
    return prisma.shippingZone.findUnique({ where: { country } });
  }

  async findShippingZoneByCountryExcluding(country, excludeId) {
    return prisma.shippingZone.findFirst({
      where: { country, id: { not: excludeId } },
    });
  }

  async createShippingZone(data) {
    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.shippingZone.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.shippingZone.create({
        data: {
          country: data.country,
          label: data.label,
          rate: data.rate,
          freeShippingMinOrder: data.freeShippingMinOrder ?? null,
          isDefault: data.isDefault,
        },
      });
    });
  }

  async updateShippingZone(id, data) {
    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.shippingZone.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.shippingZone.update({
        where: { id },
        data: {
          country: data.country,
          label: data.label,
          rate: data.rate,
          freeShippingMinOrder: data.freeShippingMinOrder ?? null,
          isDefault: data.isDefault,
        },
      });
    });
  }

  async deleteShippingZone(id) {
    return prisma.shippingZone.delete({ where: { id } });
  }

  // ── Municipality Shipping Rates ──────────────────────────
  static get rateInclude() {
    return { municipality: { include: { parent: { include: { parent: true } } } } };
  }

  async findAllMunicipalityRates() {
    return prisma.municipalityShippingRate.findMany({
      include: SettingsRepository.rateInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async findMunicipalityRateById(id) {
    return prisma.municipalityShippingRate.findUnique({ where: { id } });
  }

  async findMunicipalityRateByMunicipality(municipalityId) {
    return prisma.municipalityShippingRate.findUnique({
      where: { municipalityId },
    });
  }

  async findMunicipalityRateByMunicipalityExcluding(municipalityId, excludeId) {
    return prisma.municipalityShippingRate.findFirst({
      where: { municipalityId, id: { not: excludeId } },
    });
  }

  async findAddressBookEntry(id) {
    return prisma.addressBook.findUnique({ where: { id } });
  }

  async createMunicipalityRate(data) {
    return prisma.municipalityShippingRate.create({
      data: {
        municipalityId: data.municipalityId,
        label: data.label || null,
        rate: data.rate,
        freeShippingMinOrder: data.freeShippingMinOrder ?? null,
      },
      include: SettingsRepository.rateInclude,
    });
  }

  async updateMunicipalityRate(id, data) {
    return prisma.municipalityShippingRate.update({
      where: { id },
      data: {
        municipalityId: data.municipalityId,
        label: data.label || null,
        rate: data.rate,
        freeShippingMinOrder: data.freeShippingMinOrder ?? null,
      },
      include: SettingsRepository.rateInclude,
    });
  }

  async deleteMunicipalityRate(id) {
    return prisma.municipalityShippingRate.delete({ where: { id } });
  }

  // ── Tax Rates ────────────────────────────────────────────
  async findAllTaxRates() {
    return prisma.taxRate.findMany({ orderBy: { country: "asc" } });
  }

  async findTaxRateById(id) {
    return prisma.taxRate.findUnique({ where: { id } });
  }

  async findTaxRateByCountry(country) {
    return prisma.taxRate.findUnique({ where: { country } });
  }

  async findTaxRateByCountryExcluding(country, excludeId) {
    return prisma.taxRate.findFirst({ where: { country, id: { not: excludeId } } });
  }

  async createTaxRate(data) {
    return prisma.taxRate.create({ data });
  }

  async updateTaxRate(id, data) {
    return prisma.taxRate.update({ where: { id }, data });
  }

  async deleteTaxRate(id) {
    return prisma.taxRate.delete({ where: { id } });
  }

  // ── Payment Settings ─────────────────────────────────────
  async getPaymentSettings() {
    return getPaymentSettings();
  }

  async updatePaymentSettings(data) {
    return updatePaymentSettings(data);
  }

  // ── Email Settings ───────────────────────────────────────
  async getEmailSettings() {
    return getEmailSettings();
  }

  async updateEmailSettings(data) {
    return updateEmailSettings(data);
  }

  // ── Invoice Settings ─────────────────────────────────────
  async getInvoiceSettings() {
    return getInvoiceSettings();
  }

  async updateInvoiceSettings(data) {
    return updateInvoiceSettings(data);
  }
}
