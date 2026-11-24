import { prisma } from "@/lib/prisma";
import WishlistRepository from "./repositories/WishlistRepository";
import WishlistService from "./services/WishlistService";
import WishlistController from "./controllers/WishlistController";

export const wishlistRepository = new WishlistRepository(prisma);
export const wishlistService = new WishlistService(wishlistRepository);
export const wishlistController = new WishlistController(wishlistService);

export { WishlistRepository, WishlistService, WishlistController };
