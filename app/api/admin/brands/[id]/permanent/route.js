import { brandController } from "@/modules/brand";

export async function DELETE(request, context) {
  return brandController.permanentDeleteBrand(request, context);
}
