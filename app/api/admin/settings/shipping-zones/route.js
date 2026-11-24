import { settingsController } from "@/modules/settings";

export async function GET() {
  return settingsController.getShippingZones();
}

export async function POST(request) {
  return settingsController.createShippingZone(request);
}
