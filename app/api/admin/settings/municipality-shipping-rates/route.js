import { settingsController } from "@/modules/settings";

export async function GET() {
  return settingsController.getMunicipalityRates();
}

export async function POST(request) {
  return settingsController.createMunicipalityRate(request);
}
