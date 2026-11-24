import { cartController } from "@/modules/cart";

export async function POST(request) {
  return cartController.mergeCart(request);
}
