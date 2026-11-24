import { ok, handleApiError } from "@/lib/api";
import { requireUser, requireAdmin } from "@/lib/session";

export default class ReviewController {
  constructor(reviewService) {
    this.reviewService = reviewService;
  }

  async submitReview(request) {
    try {
      const user = await requireUser();
      const body = await request.json();
      const review = await this.reviewService.submitReview(user.id, body);
      return ok(review, "Review submitted");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getAdminReviews(request) {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const data = await this.reviewService.getAdminReviews(searchParams);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateReviewStatus(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const review = await this.reviewService.updateReviewStatus(id, body);
      return ok(review, "Review updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteReview(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.reviewService.deleteReview(id);
      return ok(null, "Review deleted");
    } catch (error) {
      return handleApiError(error);
    }
  }
}
