import { productController } from "@/modules/product";

export async function GET(request) {
  return productController.getStorefrontProducts(request);
}
