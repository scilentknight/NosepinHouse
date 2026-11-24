import { materialController } from "@/modules/material";

export async function GET(request) {
  return materialController.getMaterialRates(request);
}

export async function POST(request) {
  return materialController.createBaseRate(request);
}
