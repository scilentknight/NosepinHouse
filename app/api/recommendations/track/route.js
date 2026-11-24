import { recommendationController } from "@/modules/recommendation";

export async function POST(request) {
  return recommendationController.trackInteraction(request);
}
