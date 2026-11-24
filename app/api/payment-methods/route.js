import { settingsController } from "@/modules/settings";

export async function GET() {
  return settingsController.getPublicPaymentMethods();
}
