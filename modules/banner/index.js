import { prisma } from "@/lib/prisma";
import BannerRepository from "./repositories/BannerRepository";
import BannerService from "./services/BannerService";
import BannerController from "./controllers/BannerController";

export const bannerRepository = new BannerRepository(prisma);
export const bannerService = new BannerService(bannerRepository);
export const bannerController = new BannerController(bannerService);

export { BannerRepository, BannerService, BannerController };
