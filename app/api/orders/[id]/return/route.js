import { orderController } from "@/modules/order";

export async function POST(request, { params }) {
  const { id: rawId } = await params;
  return orderController.userRequestReturn(request, Number(rawId));
}
