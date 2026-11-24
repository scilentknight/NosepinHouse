import { orderController } from "@/modules/order";

export async function PATCH(request, { params }) {
  const { id: rawId } = await params;
  return orderController.adminProcessReturn(request, Number(rawId));
}
