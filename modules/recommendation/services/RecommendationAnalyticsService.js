export default class RecommendationAnalyticsService {
  constructor(recommendationRepository) {
    this.recommendationRepository = recommendationRepository;
  }

  async getDashboardAnalytics(days = 30) {
    const raw = await this.recommendationRepository.getAnalytics(days);

    const typeCounts = new Map(
      raw.interactionsByType.map((t) => [t.eventType, t._count._all])
    );

    const totalViews = typeCounts.get("VIEW") || 0;
    const recClicks = typeCounts.get("RECOMMENDATION_CLICK") || 0;
    const cartAdds = typeCounts.get("CART_ADD") || 0;
    const purchases = typeCounts.get("PURCHASE") || 0;
    const wishlistAdds = typeCounts.get("WISHLIST_ADD") || 0;

    // Approximate recommendation impressions (each page view with recommendations presents ~4-8 impressions)
    const estimatedImpressions = Math.max(recClicks, totalViews * 2);
    const ctr = estimatedImpressions > 0
      ? Number(((recClicks / estimatedImpressions) * 100).toFixed(2))
      : 0;

    // Recommendation Conversion Rate (clicks that resulted in cart add / purchase actions)
    const conversionRate = recClicks > 0
      ? Number((((cartAdds + purchases) / recClicks) * 100).toFixed(2))
      : 0;

    return {
      days,
      summary: {
        totalInteractions: raw.totalInteractions,
        recommendationClicks: recClicks,
        estimatedImpressions,
        clickThroughRate: ctr,
        conversionRate,
        cartAdds,
        purchases,
        wishlistAdds,
      },
      algorithmBalance: {
        contentBasedWeight: 60,
        collaborativeWeight: 40,
        description: "60% Content-Based (Product attributes & material similarity) + 40% Collaborative (User-User taste matching)",
      },
      topEngagedProducts: raw.topRecommendedInteractions,
      recentActivity: raw.recentInteractionsByDay.slice(-50),
    };
  }
}
