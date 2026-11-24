import { productController } from "@/modules/product";

export async function DELETE(request, context) {
  return productController.permanentDeleteProduct(request, context);
}
