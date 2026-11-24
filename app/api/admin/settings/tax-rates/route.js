import { settingsController } from "@/modules/settings";

export async function GET() {
  return settingsController.getTaxRates();
}

export async function POST(request) {
  return settingsController.createTaxRate(request);
}
