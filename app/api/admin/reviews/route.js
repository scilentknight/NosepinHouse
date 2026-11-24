import { reviewController } from "@/modules/review";

export async function GET(request) {
  return reviewController.getAdminReviews(request);
}
