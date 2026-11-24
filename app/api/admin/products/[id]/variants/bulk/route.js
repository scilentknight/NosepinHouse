import { productVariantController } from "@/modules/product";

export async function POST(request, context) {
  return productVariantController.bulkUpdateOrAction(request, context);
}
