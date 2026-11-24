import { productVariantController } from "@/modules/product";

export async function PUT(request, context) {
  return productVariantController.updateVariant(request, context);
}

export async function DELETE(request, context) {
  return productVariantController.deleteVariant(request, context);
}
