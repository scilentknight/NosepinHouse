import { couponController } from "@/modules/coupon";

export async function POST(request) {
  return couponController.validateCoupon(request);
}
