import { prisma } from "@/lib/prisma";
import ProductRepository from "./repositories/ProductRepository";
import ProductVariantRepository from "./repositories/ProductVariantRepository";
import ProductService from "./services/ProductService";
import ProductVariantService from "./services/ProductVariantService";
import ProductController from "./controllers/ProductController";
import ProductVariantController from "./controllers/ProductVariantController";

// Repository Layer
export const productRepository = new ProductRepository(prisma);
export const productVariantRepository = new ProductVariantRepository(prisma);

// Service Layer
export const productService = new ProductService(productRepository);
export const productVariantService = new ProductVariantService(
  productVariantRepository,
  productRepository
);

// Controller Layer
export const productController = new ProductController(productService);
export const productVariantController = new ProductVariantController(productVariantService);

// Class Exports
export {
  ProductRepository,
  ProductVariantRepository,
  ProductService,
  ProductVariantService,
  ProductController,
  ProductVariantController,
};
