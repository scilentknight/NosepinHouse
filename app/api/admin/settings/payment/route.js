import { settingsController } from "@/modules/settings";

export async function GET() {
  return settingsController.getPaymentSettings();
}

export async function PUT(request) {
  return settingsController.updatePaymentSettings(request);
}
