import AppError from "../../../core/errors/AppError.js";

const EVENT_WEIGHTS = {
  VIEW: 1.0,
  WISHLIST_ADD: 3.0,
  WISHLIST_REMOVE: 0.0,
  CART_ADD: 4.0,
  CART_REMOVE: 0.0,
  PURCHASE: 5.0,
  RATING: 3.0, // default if no specific rating provided
  RECOMMENDATION_CLICK: 1.5,
};

export default class InteractionTrackingService {
  constructor(recommendationRepository) {
    this.recommendationRepository = recommendationRepository;
  }

  /**
   * Track an event. Client supplies eventType, productId, metadata.
   * Weight is ALWAYS computed and enforced by the server.
   */
  async trackEvent({ userId, sessionId, productId, eventType, metadata }) {
    if (!productId || Number.isNaN(Number(productId))) {
      throw new AppError("Valid productId is required", 400);
    }

    const normalizedEventType = String(eventType || "").toUpperCase();
    if (!EVENT_WEIGHTS.hasOwnProperty(normalizedEventType)) {
      throw new AppError(`Invalid event type: ${eventType}`, 400);
    }

    // Determine weight
    let weight = EVENT_WEIGHTS[normalizedEventType];
    if (normalizedEventType === "RATING" && metadata?.rating) {
      const r = Number(metadata.rating);
      if (r >= 1 && r <= 5) {
        weight = r;
      }
    }

    // Deduplicate rapid repeat views (within 10 minutes)
    if (normalizedEventType === "VIEW") {
      const recent = await this.recommendationRepository.findRecentInteraction(
        userId,
        sessionId,
        productId,
        "VIEW",
        600000 // 10 minutes
      );
      if (recent) {
        // Already recorded recently; return quietly without duplicate DB writes
        return { recorded: false, duplicate: true };
      }
    }

    const recorded = await this.recommendationRepository.recordInteraction({
      userId: userId ? Number(userId) : null,
      sessionId: sessionId || null,
      productId: Number(productId),
      eventType: normalizedEventType,
      weight,
      metadata: metadata || null,
    });

    return { recorded: true, id: recorded.id };
  }

  /**
   * Merge guest session interactions to authenticated user upon login.
   */
  async mergeGuest(sessionId, userId) {
    if (!sessionId || !userId) return { count: 0 };
    return this.recommendationRepository.mergeGuestInteractions(sessionId, userId);
  }
}
