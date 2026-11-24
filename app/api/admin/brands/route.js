import { brandController } from "@/modules/brand";

export async function GET(request) {
  return brandController.getAdminBrands(request);
}

export async function POST(request) {
  return brandController.createBrand(request);
}
