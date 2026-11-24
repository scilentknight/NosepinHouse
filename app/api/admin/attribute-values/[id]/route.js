import { attributeController } from "@/modules/attribute";

export async function PUT(request, context) {
  return attributeController.updateValue(request, context);
}

export async function DELETE(request, context) {
  return attributeController.deleteValue(request, context);
}
