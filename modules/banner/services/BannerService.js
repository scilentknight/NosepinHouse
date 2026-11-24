import AppError from "@/core/errors/AppError";
import { bannerSchema, bannerReorderSchema } from "@/schemas/admin-banner";

export default class BannerService {
  constructor(bannerRepository) {
    this.bannerRepository = bannerRepository;
  }

  async getBanners() {
    return this.bannerRepository.findAll();
  }

  async getBannerById(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid id", 400);

    const banner = await this.bannerRepository.findById(numId);
    if (!banner) throw new AppError("Banner not found", 404);

    return banner;
  }

  async createBanner(body) {
    const parsed = bannerSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    const last = await this.bannerRepository.findLastBySortOrder();
    const sortOrder = (last?.sortOrder ?? 0) + 1;

    return this.bannerRepository.create({
      title: data.title,
      subtitle: data.subtitle || null,
      image: data.image,
      linkUrl: data.linkUrl || null,
      buttonText: data.buttonText || null,
      active: data.active,
      sortOrder,
    });
  }

  async updateBanner(id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid id", 400);

    const existing = await this.bannerRepository.findById(numId);
    if (!existing) throw new AppError("Banner not found", 404);

    const parsed = bannerSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    return this.bannerRepository.update(numId, {
      title: data.title,
      subtitle: data.subtitle || null,
      image: data.image,
      linkUrl: data.linkUrl || null,
      buttonText: data.buttonText || null,
      active: data.active,
    });
  }

  async deleteBanner(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid id", 400);

    const existing = await this.bannerRepository.findById(numId);
    if (!existing) throw new AppError("Banner not found", 404);

    return this.bannerRepository.delete(numId);
  }

  async reorderBanners(body) {
    const parsed = bannerReorderSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    return this.bannerRepository.reorder(parsed.data.items);
  }
}
