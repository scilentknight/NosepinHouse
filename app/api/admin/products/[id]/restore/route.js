import { productController } from "@/modules/product";

export async function POST(request, context) {
  return productController.restoreProduct(request, context);
}
