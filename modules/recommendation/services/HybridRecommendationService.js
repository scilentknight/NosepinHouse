export default class HybridRecommendationService {
  constructor(recommendationRepository, cbfService, cfService) {
    this.recommendationRepository = recommendationRepository;
    this.cbfService = cbfService;
    this.cfService = cfService;
    this.DEFAULT_ALPHA = 0.6; // 60% CBF, 40% CF
  }

  /**
   * Calculate exact hybrid score given CBF, CF, and alpha factor.
   * Formula: R(u, i) = alpha * CBF + (1 - alpha) * CF
   */
  calculateScore(cbfScore, cfScore, alpha = this.DEFAULT_ALPHA) {
    const cbf = Math.max(0, Math.min(1, Number(cbfScore) || 0));
    const cf = Math.max(0, Math.min(1, Number(cfScore) || 0));
    const a = Math.max(0, Math.min(1, Number(alpha)));

    const score = a * cbf + (1 - a) * cf;
    return Number(score.toFixed(4));
  }

  /**
   * Generate personalized recommendations using real Hybrid Recommendation algorithm.
   */
  async getPersonalizedRecommendations(userId, sessionId, options = {}) {
    const limit = Math.max(1, Math.min(50, Number(options.limit) || 8));
    const customAlpha = options.alpha !== undefined ? Number(options.alpha) : this.DEFAULT_ALPHA;

    // 1. Fetch eligible active, in-stock products
    const eligibleProducts = await this.recommendationRepository.getEligibleProducts();
    if (!eligibleProducts || eligibleProducts.length === 0) {
      return [];
    }

    // 2. Fetch user interactions (views, cart, wishlist, orders, reviews)
    const userInteractions = await this.recommendationRepository.getUserInteractions(userId, sessionId);

    // COLD-START: If user has ZERO interactions, fallback to trending & bestsellers
    if (!userInteractions || userInteractions.length === 0) {
      return this.handleColdStartNewUser(limit, options.categorySlug);
    }

    // 3. Run Content-Based Filtering
    const cbfResults = this.cbfService.getRecommendationsForUser(
      userInteractions,
      eligibleProducts,
      limit * 3
    );
    const cbfMap = new Map(cbfResults.map((r) => [r.productId, r]));

    // 4. Run Collaborative Filtering if user is logged in
    let cfResults = [];
    if (userId) {
      const userItemMatrix = await this.recommendationRepository.getAllUserInteractionMatrix();
      cfResults = this.cfService.getRecommendationsForUser(
        userId,
        userItemMatrix,
        eligibleProducts,
        limit * 3
      );
    }
    const cfMap = new Map(cfResults.map((r) => [r.productId, r]));

    // 5. Determine dynamic alpha based on user interaction volume (Cold-Start with limited interactions)
    let effectiveAlpha = customAlpha;
    const interactionCount = userInteractions.length;

    if (interactionCount < 3) {
      // Very limited interactions: heavily emphasize Content-Based
      effectiveAlpha = 0.85;
    } else if (interactionCount < 6) {
      // Moderate interactions: lean Content-Based
      effectiveAlpha = 0.70;
    } else {
      effectiveAlpha = customAlpha;
    }

    // 6. Combine all candidate products
    const candidateProductIds = new Set([
      ...cbfResults.map((r) => r.productId),
      ...cfResults.map((r) => r.productId),
    ]);

    const productMap = new Map(eligibleProducts.map((p) => [p.id, p]));
    const hybridRankings = [];

    for (const productId of candidateProductIds) {
      const product = productMap.get(productId);
      if (!product) continue;

      const cbfItem = cbfMap.get(productId);
      const cfItem = cfMap.get(productId);

      const hasCBF = cbfItem && typeof cbfItem.cbfScore === "number";
      const hasCF = cfItem && typeof cfItem.cfScore === "number";

      let finalScore = 0;
      let strategy = "HYBRID";
      let reason = "";

      if (hasCBF && hasCF) {
        // True Hybrid Formula: R(u, i) = alpha * CBF + (1 - alpha) * CF
        finalScore = this.calculateScore(cbfItem.cbfScore, cfItem.cfScore, effectiveAlpha);
        strategy = "HYBRID";
        reason = `Matches your jewellery style and preferred by customers with similar taste`;
      } else if (hasCBF && !hasCF) {
        // Fallback: Only CBF available
        finalScore = cbfItem.cbfScore;
        strategy = "CONTENT_BASED";
        reason = cbfItem.reason || "Matches product attributes you have explored";
      } else if (!hasCBF && hasCF) {
        // Fallback: Only CF available
        finalScore = cfItem.cfScore;
        strategy = "COLLABORATIVE";
        reason = cfItem.reason || "Popular among shoppers with matching preferences";
      }

      hybridRankings.push({
        id: product.id,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        discountPercent: product.discountPercent != null ? Number(product.discountPercent) : null,
        colorway: product.colorway,
        stock: product.stock,
        featuredImage: product.featuredImage || product.images?.[0]?.url || null,
        category: product.category ? { id: product.category.id, name: product.category.name, slug: product.category.slug } : null,
        rating: product.reviews?.length
          ? Math.round((product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length) * 10) / 10
          : 0,
        reviewCount: product.reviews?.length || 0,
        scores: {
          hybridScore: finalScore,
          cbfScore: hasCBF ? cbfItem.cbfScore : null,
          cfScore: hasCF ? cfItem.cfScore : null,
          alpha: effectiveAlpha,
        },
        strategy,
        reason,
      });
    }

    // Sort descending by Hybrid Score
    hybridRankings.sort((a, b) => b.scores.hybridScore - a.scores.hybridScore);

    // If hybrid returned fewer items than limit, backfill with trending items
    if (hybridRankings.length < limit) {
      const existingIds = new Set(hybridRankings.map((h) => h.id));
      const trending = await this.recommendationRepository.getTrending(limit);

      for (const p of trending) {
        if (existingIds.has(p.id)) continue;
        hybridRankings.push({
          id: p.id,
          productId: p.id,
          name: p.name,
          slug: p.slug,
          price: Number(p.price),
          compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
          discountPercent: p.discountPercent != null ? Number(p.discountPercent) : null,
          colorway: p.colorway,
          stock: p.stock,
          featuredImage: p.featuredImage || p.images?.[0]?.url || null,
          category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
          rating: p.reviews?.length
            ? Math.round((p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length) * 10) / 10
            : 0,
          reviewCount: p.reviews?.length || 0,
          scores: {
            hybridScore: 0.5,
            cbfScore: null,
            cfScore: null,
            alpha: effectiveAlpha,
          },
          strategy: "TRENDING_FALLBACK",
          reason: "Trending choice among Nosepin House customers",
        });
        if (hybridRankings.length >= limit) break;
      }
    }

    return hybridRankings.slice(0, limit);
  }

  /**
   * Handle cold-start for new / anonymous users with zero interactions.
   */
  async handleColdStartNewUser(limit = 8, categorySlug = null) {
    const [trending, bestsellers] = await Promise.all([
      this.recommendationRepository.getTrending(limit),
      this.recommendationRepository.getBestsellers(limit),
    ]);

    const seenIds = new Set();
    const results = [];

    const addProduct = (p, strategy, reason) => {
      if (seenIds.has(p.id)) return;
      seenIds.add(p.id);

      results.push({
        id: p.id,
        productId: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        discountPercent: p.discountPercent != null ? Number(p.discountPercent) : null,
        colorway: p.colorway,
        stock: p.stock,
        featuredImage: p.featuredImage || p.images?.[0]?.url || null,
        category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
        rating: p.reviews?.length
          ? Math.round((p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length) * 10) / 10
          : 0,
        reviewCount: p.reviews?.length || 0,
        scores: {
          hybridScore: 0.75,
          cbfScore: null,
          cfScore: null,
          alpha: this.DEFAULT_ALPHA,
        },
        strategy,
        reason,
      });
    };

    // Blend Trending and Bestsellers
    for (let i = 0; i < Math.max(trending.length, bestsellers.length); i++) {
      if (bestsellers[i]) {
        addProduct(bestsellers[i], "BESTSELLER_FALLBACK", "Bestselling favourite among our customers");
      }
      if (trending[i]) {
        addProduct(trending[i], "TRENDING_FALLBACK", "Trending piece right now");
      }
      if (results.length >= limit) break;
    }

    return results.slice(0, limit);
  }

  /**
   * Get Similar Products for a given product (Content-Based feature similarity).
   */
  async getSimilarProducts(productId, limit = 6) {
    const eligibleProducts = await this.recommendationRepository.getEligibleProducts();
    const similar = this.cbfService.getSimilarProducts(productId, eligibleProducts, limit);

    return similar.map((item) => {
      const p = item.product;
      return {
        id: p.id,
        productId: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        discountPercent: p.discountPercent != null ? Number(p.discountPercent) : null,
        colorway: p.colorway,
        stock: p.stock,
        featuredImage: p.featuredImage || p.images?.[0]?.url || null,
        category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
        rating: p.reviews?.length
          ? Math.round((p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length) * 10) / 10
          : 0,
        reviewCount: p.reviews?.length || 0,
        scores: {
          similarityScore: item.similarity,
        },
        strategy: "SIMILAR_ATTRIBUTES",
        reason: item.reason,
      };
    });
  }

  /**
   * Get Trending Jewellery.
   */
  async getTrending(limit = 8) {
    const products = await this.recommendationRepository.getTrending(limit);
    return products.map((p) => ({
      id: p.id,
      productId: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      discountPercent: p.discountPercent != null ? Number(p.discountPercent) : null,
      colorway: p.colorway,
      stock: p.stock,
      featuredImage: p.featuredImage || p.images?.[0]?.url || null,
      category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
      rating: p.reviews?.length
        ? Math.round((p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length) * 10) / 10
        : 0,
      reviewCount: p.reviews?.length || 0,
      strategy: "TRENDING",
      reason: "High customer interest and engagement",
    }));
  }

  /**
   * Get Bestsellers.
   */
  async getBestsellers(limit = 8) {
    const products = await this.recommendationRepository.getBestsellers(limit);
    return products.map((p) => ({
      id: p.id,
      productId: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      discountPercent: p.discountPercent != null ? Number(p.discountPercent) : null,
      colorway: p.colorway,
      stock: p.stock,
      featuredImage: p.featuredImage || p.images?.[0]?.url || null,
      category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
      rating: p.reviews?.length
        ? Math.round((p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length) * 10) / 10
        : 0,
      reviewCount: p.reviews?.length || 0,
      strategy: "BESTSELLER",
      reason: "Most purchased pieces by customers",
    }));
  }
}
