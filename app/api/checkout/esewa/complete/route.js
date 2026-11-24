import { checkoutController } from "@/modules/checkout";

export async function POST(request) {
  return checkoutController.completeEsewaPayment(request);
}
