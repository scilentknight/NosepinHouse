import { settingsController } from "@/modules/settings";

export async function GET() {
  return settingsController.getInvoiceSettings();
}

export async function PUT(request) {
  return settingsController.updateInvoiceSettings(request);
}
