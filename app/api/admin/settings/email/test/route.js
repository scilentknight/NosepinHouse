import { settingsController } from "@/modules/settings";

export async function POST(request) {
  return settingsController.sendTestEmail(request);
}
