import { ok, fail, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { ApiError } from "@/lib/session";
import { MailNotConfiguredError } from "@/lib/mail";
import {
  shippingZoneSchema,
  municipalityShippingRateSchema,
  taxRateSchema,
  paymentSettingsSchema,
  emailSettingsSchema,
  testEmailSchema,
  invoiceSettingsSchema,
} from "@/schemas/admin-settings";

export default class SettingsController {
  constructor(settingsService) {
    this.settingsService = settingsService;
  }

  // ── Shipping Zones ──────────────────────────────────────
  async getShippingZones() {
    try {
      await requireAdmin();
      const data = await this.settingsService.getShippingZones();
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async createShippingZone(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const parsed = shippingZoneSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      const zone = await this.settingsService.createShippingZone(parsed.data);
      return ok(zone, "Shipping zone created");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateShippingZone(request, id) {
    try {
      await requireAdmin();
      if (Number.isNaN(id)) return fail(400, "Invalid shipping zone id");
      const body = await request.json();
      const parsed = shippingZoneSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      const zone = await this.settingsService.updateShippingZone(id, parsed.data);
      return ok(zone, "Shipping zone updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteShippingZone(id) {
    try {
      await requireAdmin();
      if (Number.isNaN(id)) return fail(400, "Invalid shipping zone id");
      await this.settingsService.deleteShippingZone(id);
      return ok(null, "Shipping zone deleted");
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ── Municipality Shipping Rates ──────────────────────────
  async getMunicipalityRates() {
    try {
      await requireAdmin();
      const data = await this.settingsService.getMunicipalityRates();
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async createMunicipalityRate(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const parsed = municipalityShippingRateSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      const rate = await this.settingsService.createMunicipalityRate(parsed.data);
      return ok(rate, "Municipality shipping rate created");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateMunicipalityRate(request, id) {
    try {
      await requireAdmin();
      if (Number.isNaN(id)) return fail(400, "Invalid shipping rate id");
      const body = await request.json();
      const parsed = municipalityShippingRateSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      const rate = await this.settingsService.updateMunicipalityRate(id, parsed.data);
      return ok(rate, "Municipality shipping rate updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteMunicipalityRate(id) {
    try {
      await requireAdmin();
      if (Number.isNaN(id)) return fail(400, "Invalid shipping rate id");
      await this.settingsService.deleteMunicipalityRate(id);
      return ok(null, "Municipality shipping rate deleted");
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ── Tax Rates ────────────────────────────────────────────
  async getTaxRates() {
    try {
      await requireAdmin();
      const data = await this.settingsService.getTaxRates();
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async createTaxRate(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const parsed = taxRateSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      const rate = await this.settingsService.createTaxRate(parsed.data);
      return ok(rate, "Tax rate created");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateTaxRate(request, id) {
    try {
      await requireAdmin();
      if (Number.isNaN(id)) return fail(400, "Invalid tax rate id");
      const body = await request.json();
      const parsed = taxRateSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      const rate = await this.settingsService.updateTaxRate(id, parsed.data);
      return ok(rate, "Tax rate updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async toggleTaxRateActive(request, id) {
    try {
      await requireAdmin();
      if (Number.isNaN(id)) return fail(400, "Invalid tax rate id");
      const body = await request.json();
      const rate = await this.settingsService.toggleTaxRateActive(id, body?.active);
      return ok(rate, "Tax rate updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteTaxRate(id) {
    try {
      await requireAdmin();
      if (Number.isNaN(id)) return fail(400, "Invalid tax rate id");
      await this.settingsService.deleteTaxRate(id);
      return ok(null, "Tax rate deleted");
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ── Payment Settings ─────────────────────────────────────
  async getPaymentSettings() {
    try {
      await requireAdmin();
      const data = await this.settingsService.getPaymentSettings();
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getPublicPaymentMethods() {
    try {
      const data = await this.settingsService.getPublicPaymentMethods();
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updatePaymentSettings(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const parsed = paymentSettingsSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      const data = await this.settingsService.updatePaymentSettings(parsed.data);
      return ok(data, "Payment settings saved");
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ── Email Settings ───────────────────────────────────────
  async getEmailSettings() {
    try {
      await requireAdmin();
      const data = await this.settingsService.getEmailSettings();
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateEmailSettings(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const parsed = emailSettingsSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      const data = await this.settingsService.updateEmailSettings(parsed.data);
      return ok(data, "Email settings saved");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async sendTestEmail(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const parsed = testEmailSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      const to = await this.settingsService.sendTestEmail(parsed.data);
      return ok(null, `Test email sent to ${to}`);
    } catch (error) {
      if (error instanceof ApiError) return handleApiError(error);
      if (error instanceof MailNotConfiguredError) {
        return fail(400, "Enable email sending and fill in SMTP host + from email before testing");
      }
      if (error instanceof Error) return fail(502, `SMTP error: ${error.message}`);
      return handleApiError(error);
    }
  }

  // ── Invoice Settings ─────────────────────────────────────
  async getInvoiceSettings() {
    try {
      await requireAdmin();
      const data = await this.settingsService.getInvoiceSettings();
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateInvoiceSettings(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const parsed = invoiceSettingsSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      const data = await this.settingsService.updateInvoiceSettings(parsed.data);
      return ok(data, "Invoice settings saved");
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ── Shipping Estimate ────────────────────────────────────
  async estimateShipping(request) {
    try {
      const { country, subtotal, discount, municipalityId } = await request.json();
      if (!country || typeof country !== "string")
        return fail(400, "Country is required");
      const normalizedSubtotal = Number(subtotal) || 0;
      const normalizedDiscount = Number(discount) || 0;
      const normalizedMunicipalityId =
        Number.isFinite(Number(municipalityId)) && municipalityId
          ? Number(municipalityId)
          : null;
      const result = await this.settingsService.estimateShipping(
        country,
        normalizedSubtotal,
        normalizedDiscount,
        normalizedMunicipalityId
      );
      return ok(result);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
