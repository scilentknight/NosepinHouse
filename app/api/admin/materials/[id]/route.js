import { materialController } from "@/modules/material";

export async function GET(request, context) {
  return materialController.getMaterialById(request, context);
}

export async function PUT(request, context) {
  return materialController.updateMaterial(request, context);
}

export async function DELETE(request, context) {
  return materialController.deleteMaterial(request, context);
}
