import { productController } from "@/modules/product";

export async function GET(request, context) {
  return productController.getAdminProductById(request, context);
}

export async function PUT(request, context) {
  return productController.updateProduct(request, context);
}

export async function DELETE(request, context) {
  return productController.deleteProduct(request, context);
}
