import { bannerController } from "@/modules/banner";

export async function GET() {
  return bannerController.getBanners();
}

export async function POST(request) {
  return bannerController.createBanner(request);
}
