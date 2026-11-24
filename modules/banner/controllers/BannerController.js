import { ok, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export default class BannerController {
  constructor(bannerService) {
    this.bannerService = bannerService;
  }

  async getBanners() {
    try {
      await requireAdmin();
      const banners = await this.bannerService.getBanners();
      return ok(banners);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getBannerById(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const banner = await this.bannerService.getBannerById(id);
      return ok(banner);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async createBanner(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      const banner = await this.bannerService.createBanner(body);
      return ok(banner, "Banner created");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateBanner(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const banner = await this.bannerService.updateBanner(id, body);
      return ok(banner, "Banner updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteBanner(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.bannerService.deleteBanner(id);
      return ok(null, "Banner deleted");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async reorderBanners(request) {
    try {
      await requireAdmin();
      const body = await request.json();
      await this.bannerService.reorderBanners(body);
      return ok(null, "Order updated");
    } catch (error) {
      return handleApiError(error);
    }
  }
}
