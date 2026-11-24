import { reviewController } from "@/modules/review";

export async function POST(request) {
  return reviewController.submitReview(request);
}
