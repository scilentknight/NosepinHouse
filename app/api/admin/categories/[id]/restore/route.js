import { categoryController } from "@/modules/category";

export async function POST(request, context) {
  return categoryController.restoreCategory(request, context);
}
