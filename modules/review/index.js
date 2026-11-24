import { prisma } from "@/lib/prisma";
import ReviewRepository from "./repositories/ReviewRepository";
import ReviewService from "./services/ReviewService";
import ReviewController from "./controllers/ReviewController";

export const reviewRepository = new ReviewRepository(prisma);
export const reviewService = new ReviewService(reviewRepository);
export const reviewController = new ReviewController(reviewService);

export { ReviewRepository, ReviewService, ReviewController };
