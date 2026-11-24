import { ok, fail, handleApiError } from "@/lib/api";
import { getCurrentUser, requireAdmin } from "@/lib/session";

function extractSessionId(request) {
  const headerSession = request.headers.get("x-session-id");
  if (headerSession) return headerSession;

  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/nh_session_id=([^;]+)/);
  return match ? match[1] : null;
}

export default class RecommendationController {
  constructor(hybridService, trackingService, analyticsService) {
    this.hybridService = hybridService;
    this.trackingService = trackingService;
    this.analyticsService = analyticsService;
  }

  /**
   * GET /api/recommendations/personalized
   */
  async getPersonalized(request) {
    try {
      const user = await getCurrentUser();
      const sessionId = extractSessionId(request);

      const url = new URL(request.url);
      const limit = Number(url.searchParams.get("limit")) || 8;
      const alpha = url.searchParams.has("alpha") ? Number(url.searchParams.get("alpha")) : undefined;
      const categorySlug = url.searchParams.get("category") || null;

      const recommendations = await this.hybridService.getPersonalizedRecommendations(
        user?.id || null,
        sessionId,
        { limit, alpha, categorySlug }
      );

      return ok(recommendations);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * GET /api/recommendations/similar/:productId
   */
  async getSimilar(request, productId) {
    try {
      if (!productId || Number.isNaN(Number(productId))) {
        return fail(400, "Valid productId is required");
      }

      const url = new URL(request.url);
      const limit = Number(url.searchParams.get("limit")) || 6;

      const similar = await this.hybridService.getSimilarProducts(Number(productId), limit);
      return ok(similar);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * GET /api/recommendations/trending
   */
  async getTrending(request) {
    try {
      const url = new URL(request.url);
      const limit = Number(url.searchParams.get("limit")) || 8;

      const trending = await this.hybridService.getTrending(limit);
      return ok(trending);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * GET /api/recommendations/bestsellers
   */
  async getBestsellers(request) {
    try {
      const url = new URL(request.url);
      const limit = Number(url.searchParams.get("limit")) || 8;

      const bestsellers = await this.hybridService.getBestsellers(limit);
      return ok(bestsellers);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * POST /api/recommendations/track
   */
  async trackInteraction(request) {
    try {
      const user = await getCurrentUser();
      const sessionId = extractSessionId(request);
      const body = await request.json().catch(() => ({}));

      const result = await this.trackingService.trackEvent({
        userId: user?.id || null,
        sessionId,
        productId: body.productId,
        eventType: body.eventType,
        metadata: body.metadata,
      });

      return ok(result, "Interaction recorded");
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * GET /api/admin/recommendations/analytics
   */
  async getAnalytics(request) {
    try {
      await requireAdmin();
      const url = new URL(request.url);
      const days = Number(url.searchParams.get("days")) || 30;

      const data = await this.analyticsService.getDashboardAnalytics(days);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
