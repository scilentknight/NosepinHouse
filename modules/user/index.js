import { prisma } from "@/lib/prisma";
import UserRepository from "./repositories/UserRepository";
import UserService from "./services/UserService";
import UserController from "./controllers/UserController";

export const userRepository = new UserRepository(prisma);
export const userService = new UserService(userRepository);
export const userController = new UserController(userService);

export { UserRepository, UserService, UserController };
