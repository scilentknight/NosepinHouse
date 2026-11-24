import { recommendationController } from "@/modules/recommendation";

export async function GET(request, { params }) {
  const { productId } = await params;
  return recommendationController.getSimilar(request, productId);
}
