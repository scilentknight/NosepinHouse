import { brandController } from "@/modules/brand";

export async function GET(request, context) {
  return brandController.getAdminBrandById(request, context);
}

export async function PUT(request, context) {
  return brandController.updateBrand(request, context);
}

export async function DELETE(request, context) {
  return brandController.deleteBrand(request, context);
}
