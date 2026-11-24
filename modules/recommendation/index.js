import RecommendationRepository from "./repositories/RecommendationRepository.js";
import ContentBasedFilteringService from "./services/ContentBasedFilteringService.js";
import CollaborativeFilteringService from "./services/CollaborativeFilteringService.js";
import HybridRecommendationService from "./services/HybridRecommendationService.js";
import InteractionTrackingService from "./services/InteractionTrackingService.js";
import RecommendationAnalyticsService from "./services/RecommendationAnalyticsService.js";
import RecommendationController from "./controllers/RecommendationController.js";

// Instantiate singletons via constructor Dependency Injection
const recommendationRepository = new RecommendationRepository();
const cbfService = new ContentBasedFilteringService();
const cfService = new CollaborativeFilteringService();

const hybridRecommendationService = new HybridRecommendationService(
  recommendationRepository,
  cbfService,
  cfService
);

const interactionTrackingService = new InteractionTrackingService(
  recommendationRepository
);

const recommendationAnalyticsService = new RecommendationAnalyticsService(
  recommendationRepository
);

const recommendationController = new RecommendationController(
  hybridRecommendationService,
  interactionTrackingService,
  recommendationAnalyticsService
);

export {
  recommendationRepository,
  cbfService,
  cfService,
  hybridRecommendationService,
  interactionTrackingService,
  recommendationAnalyticsService,
  recommendationController,
};
