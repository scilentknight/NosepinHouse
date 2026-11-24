import { bannerController } from "@/modules/banner";

export async function POST(request) {
  return bannerController.reorderBanners(request);
}
