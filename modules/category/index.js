import { prisma } from "@/lib/prisma";
import CategoryRepository from "./repositories/CategoryRepository";
import CategoryService from "./services/CategoryService";
import CategoryController from "./controllers/CategoryController";

export const categoryRepository = new CategoryRepository(prisma);
export const categoryService = new CategoryService(categoryRepository);
export const categoryController = new CategoryController(categoryService);

export { CategoryRepository, CategoryService, CategoryController };
