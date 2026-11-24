import { bannerController } from "@/modules/banner";

export async function GET(request, context) {
  return bannerController.getBannerById(request, context);
}

export async function PUT(request, context) {
  return bannerController.updateBanner(request, context);
}

export async function DELETE(request, context) {
  return bannerController.deleteBanner(request, context);
}
