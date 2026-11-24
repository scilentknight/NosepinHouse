import { categoryController } from "@/modules/category";

export async function GET() {
  return categoryController.getStorefrontCategories();
}
