import { cosineSimilarity } from "./ContentBasedFilteringService.js";

export default class CollaborativeFilteringService {
  constructor() {
    this.NEIGHBOR_COUNT = 15;
    this.MIN_SIMILARITY = 0.05;
  }

  /**
   * Calculate User-Based Collaborative Filtering recommendations.
   * targetUserId: numeric userId
   * userItemMatrix: Map<userId, Map<productId, score>>
   * eligibleProducts: Array of Product objects (for checking stock/availability)
   * topK: number of recommendations to return
   */
  getRecommendationsForUser(targetUserId, userItemMatrix, eligibleProducts, topK = 10) {
    const uId = Number(targetUserId);
    if (!uId || !userItemMatrix || !userItemMatrix.has(uId)) {
      return [];
    }

    const targetUserRatings = userItemMatrix.get(uId);
    if (!targetUserRatings || targetUserRatings.size === 0) {
      return [];
    }

    // 1. Calculate similarity with all other users
    const similarUsers = [];

    for (const [otherUserId, otherRatings] of userItemMatrix.entries()) {
      if (otherUserId === uId) continue;
      if (!otherRatings || otherRatings.size === 0) continue;

      const sim = cosineSimilarity(targetUserRatings, otherRatings);
      if (sim >= this.MIN_SIMILARITY) {
        similarUsers.push({
          userId: otherUserId,
          similarity: sim,
          ratings: otherRatings,
        });
      }
    }

    // If no similar users found, collaborative filtering cannot produce confident predictions
    if (similarUsers.length === 0) {
      return [];
    }

    // Sort to get top nearest neighbors
    similarUsers.sort((a, b) => b.similarity - a.similarity);
    const topNeighbors = similarUsers.slice(0, this.NEIGHBOR_COUNT);

    // 2. Aggregate neighbor ratings for products targetUser hasn't interacted with
    const eligibleProductIds = new Set(eligibleProducts.map((p) => p.id));
    const candidateScores = new Map(); // productId -> { weightedSum, simSum, count }

    for (const neighbor of topNeighbors) {
      for (const [productId, rating] of neighbor.ratings.entries()) {
        // Skip products the target user has already interacted with
        if (targetUserRatings.has(productId)) continue;

        // Skip products that are not currently eligible (e.g. out of stock or deleted)
        if (!eligibleProductIds.has(productId)) continue;

        const current = candidateScores.get(productId) || {
          weightedSum: 0,
          simSum: 0,
          count: 0,
        };

        current.weightedSum += neighbor.similarity * rating;
        current.simSum += neighbor.similarity;
        current.count += 1;
        candidateScores.set(productId, current);
      }
    }

    if (candidateScores.size === 0) {
      return [];
    }

    // 3. Compute predicted score and normalize to [0, 1]
    const productMap = new Map(eligibleProducts.map((p) => [p.id, p]));
    const recommendations = [];

    for (const [productId, stats] of candidateScores.entries()) {
      if (stats.simSum === 0) continue;

      // Predicted rating on 0-5 scale
      const predictedRating = stats.weightedSum / stats.simSum;

      // Normalize to 0 - 1 scale
      const normalizedScore = Math.max(0, Math.min(1, predictedRating / 5.0));

      const product = productMap.get(productId);
      if (product) {
        recommendations.push({
          productId,
          product,
          cfScore: Number(normalizedScore.toFixed(4)),
          neighborCount: stats.count,
          reason: "Popular among jewellery lovers with similar taste",
        });
      }
    }

    return recommendations.sort((a, b) => b.cfScore - a.cfScore).slice(0, topK);
  }
}
