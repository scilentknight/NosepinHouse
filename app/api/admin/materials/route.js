import { materialController } from "@/modules/material";

export async function GET() {
  return materialController.getMaterials();
}

export async function POST(request) {
  return materialController.createMaterial(request);
}
