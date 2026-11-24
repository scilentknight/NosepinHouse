import { brandController } from "@/modules/brand";

export async function POST(request) {
  return brandController.handleBulkAction(request);
}
