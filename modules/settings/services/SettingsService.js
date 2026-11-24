import AppError from "@/core/errors/AppError";
import { computeShippingAndTax } from "@/lib/checkoutCore";
import { sendMail, MailNotConfiguredError } from "@/lib/mail";

function serializeZone(zone) {
  return {
    ...zone,
    rate: Number(zone.rate),
    freeShippingMinOrder: zone.freeShippingMinOrder
      ? Number(zone.freeShippingMinOrder)
      : null,
  };
}

function serializeMunicipalityRate(rate) {
  return {
    ...rate,
    rate: Number(rate.rate),
    freeShippingMinOrder: rate.freeShippingMinOrder
      ? Number(rate.freeShippingMinOrder)
      : null,
    municipalityName: rate.municipality.name,
    districtId: rate.municipality.parentId,
    districtName: rate.municipality.parent?.name ?? null,
    provinceId: rate.municipality.parent?.parentId ?? null,
    provinceName: rate.municipality.parent?.parent?.name ?? null,
    municipality: undefined,
  };
}

function serializeTaxRate(rate) {
  return { ...rate, percent: Number(rate.percent) };
}

function serializePaymentSettings(settings) {
  return {
    ...settings,
    codMinOrderAmount: settings.codMinOrderAmount
      ? Number(settings.codMinOrderAmount)
      : null,
    codMaxOrderAmount: settings.codMaxOrderAmount
      ? Number(settings.codMaxOrderAmount)
      : null,
    esewaSecretKey: undefined,
    hasEsewaSecretKey: Boolean(settings.esewaSecretKey),
  };
}

export default class SettingsService {
  constructor(settingsRepository) {
    this.settingsRepository = settingsRepository;
  }

  // ── Shipping Zones ──────────────────────────────────────
  async getShippingZones() {
    const zones = await this.settingsRepository.findAllShippingZones();
    return zones.map(serializeZone);
  }

  async createShippingZone(data) {
    const existing = await this.settingsRepository.findShippingZoneByCountry(data.country);
    if (existing) {
      throw new AppError(409, `A shipping zone for ${data.country} already exists`);
    }
    const zone = await this.settingsRepository.createShippingZone(data);
    return serializeZone(zone);
  }

  async updateShippingZone(id, data) {
    const existing = await this.settingsRepository.findShippingZoneById(id);
    if (!existing) throw new AppError(404, "Shipping zone not found");
    const countryTaken = await this.settingsRepository.findShippingZoneByCountryExcluding(data.country, id);
    if (countryTaken) {
      throw new AppError(409, `A shipping zone for ${data.country} already exists`);
    }
    const zone = await this.settingsRepository.updateShippingZone(id, data);
    return serializeZone(zone);
  }

  async deleteShippingZone(id) {
    const existing = await this.settingsRepository.findShippingZoneById(id);
    if (!existing) throw new AppError(404, "Shipping zone not found");
    await this.settingsRepository.deleteShippingZone(id);
  }

  // ── Municipality Shipping Rates ──────────────────────────
  async getMunicipalityRates() {
    const rates = await this.settingsRepository.findAllMunicipalityRates();
    return rates.map(serializeMunicipalityRate);
  }

  async createMunicipalityRate(data) {
    const municipality = await this.settingsRepository.findAddressBookEntry(data.municipalityId);
    if (!municipality || municipality.level !== "MUNICIPALITY") {
      throw new AppError(400, "Invalid municipality");
    }
    const existing = await this.settingsRepository.findMunicipalityRateByMunicipality(data.municipalityId);
    if (existing) {
      throw new AppError(409, `A shipping rate for ${municipality.name} already exists`);
    }
    const rate = await this.settingsRepository.createMunicipalityRate(data);
    return serializeMunicipalityRate(rate);
  }

  async updateMunicipalityRate(id, data) {
    const existing = await this.settingsRepository.findMunicipalityRateById(id);
    if (!existing) throw new AppError(404, "Shipping rate not found");
    const municipality = await this.settingsRepository.findAddressBookEntry(data.municipalityId);
    if (!municipality || municipality.level !== "MUNICIPALITY") {
      throw new AppError(400, "Invalid municipality");
    }
    const taken = await this.settingsRepository.findMunicipalityRateByMunicipalityExcluding(data.municipalityId, id);
    if (taken) {
      throw new AppError(409, `A shipping rate for ${municipality.name} already exists`);
    }
    const rate = await this.settingsRepository.updateMunicipalityRate(id, data);
    return serializeMunicipalityRate(rate);
  }

  async deleteMunicipalityRate(id) {
    const existing = await this.settingsRepository.findMunicipalityRateById(id);
    if (!existing) throw new AppError(404, "Shipping rate not found");
    await this.settingsRepository.deleteMunicipalityRate(id);
  }

  // ── Tax Rates ────────────────────────────────────────────
  async getTaxRates() {
    const rates = await this.settingsRepository.findAllTaxRates();
    return rates.map(serializeTaxRate);
  }

  async createTaxRate(data) {
    const existing = await this.settingsRepository.findTaxRateByCountry(data.country);
    if (existing) {
      throw new AppError(409, `A tax rate for ${data.country} already exists`);
    }
    const rate = await this.settingsRepository.createTaxRate(data);
    return serializeTaxRate(rate);
  }

  async updateTaxRate(id, data) {
    const existing = await this.settingsRepository.findTaxRateById(id);
    if (!existing) throw new AppError(404, "Tax rate not found");
    const countryTaken = await this.settingsRepository.findTaxRateByCountryExcluding(data.country, id);
    if (countryTaken) {
      throw new AppError(409, `A tax rate for ${data.country} already exists`);
    }
    const rate = await this.settingsRepository.updateTaxRate(id, data);
    return serializeTaxRate(rate);
  }

  async toggleTaxRateActive(id, active) {
    const existing = await this.settingsRepository.findTaxRateById(id);
    if (!existing) throw new AppError(404, "Tax rate not found");
    if (typeof active !== "boolean") throw new AppError(400, "Invalid request");
    const rate = await this.settingsRepository.updateTaxRate(id, { active });
    return serializeTaxRate(rate);
  }

  async deleteTaxRate(id) {
    const existing = await this.settingsRepository.findTaxRateById(id);
    if (!existing) throw new AppError(404, "Tax rate not found");
    await this.settingsRepository.deleteTaxRate(id);
  }

  // ── Payment Settings ─────────────────────────────────────
  async getPaymentSettings() {
    const settings = await this.settingsRepository.getPaymentSettings();
    return serializePaymentSettings(settings);
  }

  async getPublicPaymentMethods() {
    const settings = await this.settingsRepository.getPaymentSettings();
    return {
      codEnabled: settings.codEnabled,
      esewaEnabled: settings.esewaEnabled,
      esewaLogo: settings.esewaLogo,
    };
  }

  async updatePaymentSettings(data) {
    const settings = await this.settingsRepository.updatePaymentSettings({
      codEnabled: data.codEnabled,
      codMinOrderAmount: data.codMinOrderAmount ?? null,
      codMaxOrderAmount: data.codMaxOrderAmount ?? null,
      esewaEnabled: data.esewaEnabled,
      esewaLogo: data.esewaLogo || null,
      esewaProductCode: data.esewaProductCode || null,
      esewaSecretKey: data.esewaSecretKey === undefined ? undefined : data.esewaSecretKey || null,
      esewaPaymentUrl: data.esewaPaymentUrl || null,
      esewaStatusUrl: data.esewaStatusUrl || null,
    });
    return serializePaymentSettings(settings);
  }

  // ── Email Settings ───────────────────────────────────────
  async getEmailSettings() {
    const settings = await this.settingsRepository.getEmailSettings();
    return { ...settings, smtpPassword: undefined, hasPassword: Boolean(settings.smtpPassword) };
  }

  async updateEmailSettings(data) {
    const settings = await this.settingsRepository.updateEmailSettings({
      enabled: data.enabled,
      smtpHost: data.smtpHost || null,
      smtpPort: data.smtpPort,
      smtpUser: data.smtpUser || null,
      smtpPassword: data.smtpPassword === undefined ? undefined : data.smtpPassword || null,
      secure: data.secure,
      fromName: data.fromName,
      fromEmail: data.fromEmail || null,
    });
    return { ...settings, smtpPassword: undefined, hasPassword: Boolean(settings.smtpPassword) };
  }

  async sendTestEmail(data) {
    await sendMail({
      to: data.to,
      subject: "Test email from your store",
      html: "<p>This is a test email confirming your SMTP settings are working correctly.</p>",
      text: "This is a test email confirming your SMTP settings are working correctly.",
    });
    return data.to;
  }

  // ── Invoice Settings ─────────────────────────────────────
  async getInvoiceSettings() {
    return this.settingsRepository.getInvoiceSettings();
  }

  async updateInvoiceSettings(data) {
    return this.settingsRepository.updateInvoiceSettings({
      companyName: data.companyName,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      phone: data.phone || null,
      email: data.email || null,
      taxId: data.taxId || null,
      footerNote: data.footerNote || null,
      logo: data.logo || null,
      invoicePrefix: data.invoicePrefix,
    });
  }

  // ── Shipping Estimate ────────────────────────────────────
  async estimateShipping(country, subtotal, discount, municipalityId) {
    return computeShippingAndTax(country, subtotal, discount, municipalityId);
  }
}
