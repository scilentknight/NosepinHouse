import { productController } from "@/modules/product";

export async function GET(request) {
  return productController.getAdminProducts(request);
}

export async function POST(request) {
  return productController.createProduct(request);
}
