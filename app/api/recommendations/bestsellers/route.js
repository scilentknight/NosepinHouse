import { recommendationController } from "@/modules/recommendation";

export async function GET(request) {
  return recommendationController.getBestsellers(request);
}
