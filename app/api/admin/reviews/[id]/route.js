import { reviewController } from "@/modules/review";

export async function PATCH(request, context) {
  return reviewController.updateReviewStatus(request, context);
}

export async function DELETE(request, context) {
  return reviewController.deleteReview(request, context);
}
