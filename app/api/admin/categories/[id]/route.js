import { categoryController } from "@/modules/category";

export async function GET(request, context) {
  return categoryController.getAdminCategoryById(request, context);
}

export async function PUT(request, context) {
  return categoryController.updateCategory(request, context);
}

export async function DELETE(request, context) {
  return categoryController.deleteCategory(request, context);
}
