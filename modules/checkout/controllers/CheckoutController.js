import { ok, fail, handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

export default class CheckoutController {
  constructor(checkoutService) {
    this.checkoutService = checkoutService;
  }

  async placeCodOrder(request) {
    try {
      const user = await requireUser();
      const body = await request.json();
      const result = await this.checkoutService.placeCodOrder(user, body);
      return ok(result, "Order placed successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async initiateEsewaPayment(request) {
    try {
      const user = await requireUser();
      const body = await request.json();
      const result = await this.checkoutService.initiateEsewaPayment(user, body, request.url);
      return ok(result);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async completeEsewaPayment(request) {
    try {
      const user = await requireUser();
      const body = await request.json();
      const result = await this.checkoutService.completeEsewaPayment(user, body);
      if (result.alreadyRecorded) {
        return ok({ orderNumber: result.orderNumber }, "Order already recorded");
      }
      return ok({ orderNumber: result.orderNumber }, "Order placed successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }
}
