import { categoryController } from "@/modules/category";

export async function POST(request) {
  return categoryController.handleBulkAction(request);
}
