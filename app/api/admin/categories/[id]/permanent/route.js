import { categoryController } from "@/modules/category";

export async function DELETE(request, context) {
  return categoryController.permanentDeleteCategory(request, context);
}
