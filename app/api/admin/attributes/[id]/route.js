import { attributeController } from "@/modules/attribute";

export async function PUT(request, context) {
  return attributeController.update(request, context);
}

export async function DELETE(request, context) {
  return attributeController.delete(request, context);
}
