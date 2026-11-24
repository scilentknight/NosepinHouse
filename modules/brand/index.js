import { prisma } from "@/lib/prisma";
import BrandRepository from "./repositories/BrandRepository";
import BrandService from "./services/BrandService";
import BrandController from "./controllers/BrandController";

export const brandRepository = new BrandRepository(prisma);
export const brandService = new BrandService(brandRepository);
export const brandController = new BrandController(brandService);

export { BrandRepository, BrandService, BrandController };
