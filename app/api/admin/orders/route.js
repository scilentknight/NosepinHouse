import { orderController } from "@/modules/order";

export async function GET(request) {
  return orderController.adminGetAll(request);
}
