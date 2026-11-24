import { orderController } from "@/modules/order";

export async function GET(request, { params }) {
  const { id: rawId } = await params;
  return orderController.adminGetOne(request, Number(rawId));
}
