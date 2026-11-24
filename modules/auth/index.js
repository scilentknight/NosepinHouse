import { prisma } from "@/lib/prisma";
import AuthRepository from "./repositories/AuthRepository";
import AuthService from "./services/AuthService";
import AuthController from "./controllers/AuthController";

export const authRepository = new AuthRepository(prisma);
export const authService = new AuthService(authRepository);
export const authController = new AuthController(authService);

export { AuthRepository, AuthService, AuthController };
