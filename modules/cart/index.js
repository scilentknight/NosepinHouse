import { prisma } from "@/lib/prisma";
import CartRepository from "./repositories/CartRepository";
import CartService from "./services/CartService";
import CartController from "./controllers/CartController";

export const cartRepository = new CartRepository(prisma);
export const cartService = new CartService(cartRepository);
export const cartController = new CartController(cartService);

export { CartRepository, CartService, CartController };
