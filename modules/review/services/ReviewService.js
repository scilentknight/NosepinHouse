import { z } from "zod";
import AppError from "@/core/errors/AppError";
import { parsePagination } from "@/lib/admin-query";
import { reviewSchema } from "@/schemas/review";
import { interactionTrackingService } from "@/modules/recommendation";

const statusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export default class ReviewService {
  constructor(reviewRepository) {
    this.reviewRepository = reviewRepository;
  }

  async submitReview(userId, body) {
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid review", 400);
    }

    const orderItem = await this.reviewRepository.findOrderItemWithOrder(parsed.data.orderItemId);
    if (!orderItem || orderItem.order.userId !== Number(userId)) {
      throw new AppError("Order item not found", 404);
    }
    if (orderItem.order.status !== "DELIVERED") {
      throw new AppError("You can only review items from delivered orders", 400);
    }
    if (!orderItem.productId) {
      throw new AppError("Product no longer exists", 400);
    }

    try {
      const review = await this.reviewRepository.createReview({
        productId: orderItem.productId,
        userId: Number(userId),
        orderItemId: orderItem.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      });

      interactionTrackingService
        .trackEvent({
          userId,
          productId: orderItem.productId,
          eventType: "RATING",
          metadata: { rating: parsed.data.rating },
        })
        .catch(() => {});

      return review;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        throw new AppError("You already reviewed this item", 409);
      }
      throw error;
    }
  }

  async getAdminReviews(searchParams) {
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const { page, pageSize, skip } = parsePagination(searchParams);

    const where = {
      ...(status === "PENDING" || status === "APPROVED" || status === "REJECTED" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { comment: { contains: search } },
              { product: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const [reviews, total] = await Promise.all([
      this.reviewRepository.findAdminReviews({ where, skip, take: pageSize }),
      this.reviewRepository.countAdminReviews(where),
    ]);

    return { reviews, total, page, pageSize };
  }

  async updateReviewStatus(id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid id", 400);

    const existing = await this.reviewRepository.findById(numId);
    if (!existing) throw new AppError("Review not found", 404);

    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    return this.reviewRepository.updateReview(numId, { status: parsed.data.status });
  }

  async deleteReview(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid id", 400);

    const existing = await this.reviewRepository.findById(numId);
    if (!existing) throw new AppError("Review not found", 404);

    return this.reviewRepository.deleteReview(numId);
  }
}
