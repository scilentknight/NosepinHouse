import { productVariantController } from "@/modules/product";

export async function GET(request, context) {
  return productVariantController.getVariants(request, context);
}

export async function POST(request, context) {
  return productVariantController.createVariant(request, context);
}
