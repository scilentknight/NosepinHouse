import { settingsController } from "@/modules/settings";

export async function GET() {
  return settingsController.getEmailSettings();
}

export async function PUT(request) {
  return settingsController.updateEmailSettings(request);
}
