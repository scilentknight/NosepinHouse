import { couponController } from "@/modules/coupon";

export async function GET(request, context) {
  return couponController.getAdminCouponById(request, context);
}

export async function PUT(request, context) {
  return couponController.updateCoupon(request, context);
}

export async function PATCH(request, context) {
  return couponController.toggleCouponActive(request, context);
}

export async function DELETE(request, context) {
  return couponController.deleteCoupon(request, context);
}
