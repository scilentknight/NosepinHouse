import { checkoutController } from "@/modules/checkout";

export async function POST(request) {
  return checkoutController.initiateEsewaPayment(request);
}
