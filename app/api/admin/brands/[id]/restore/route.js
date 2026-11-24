import { brandController } from "@/modules/brand";

export async function POST(request, context) {
  return brandController.restoreBrand(request, context);
}
