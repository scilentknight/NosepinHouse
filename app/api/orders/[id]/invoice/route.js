import { orderController } from "@/modules/order";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { id: rawId } = await params;
  return orderController.userGetInvoice(request, Number(rawId));
}
