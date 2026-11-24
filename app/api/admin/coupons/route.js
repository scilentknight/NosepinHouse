import { couponController } from "@/modules/coupon";

export async function GET(request) {
  return couponController.getAdminCoupons(request);
}

export async function POST(request) {
  return couponController.createCoupon(request);
}
