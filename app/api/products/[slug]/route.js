import { productController } from "@/modules/product";

export async function GET(request, context) {
  return productController.getStorefrontProductBySlug(request, context);
}
