import { productController } from "@/modules/product";

export async function POST(request) {
  return productController.calculateCustomerPricing(request);
}
