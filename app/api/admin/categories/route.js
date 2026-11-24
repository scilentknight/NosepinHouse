import { categoryController } from "@/modules/category";

export async function GET(request) {
  return categoryController.getAdminCategories(request);
}

export async function POST(request) {
  return categoryController.createCategory(request);
}
