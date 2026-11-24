import { prisma } from "@/lib/prisma";
import AttributeRepository from "./repositories/AttributeRepository";
import AttributeService from "./services/AttributeService";
import AttributeController from "./controllers/AttributeController";

export const attributeRepository = new AttributeRepository(prisma);
export const attributeService = new AttributeService(attributeRepository);
export const attributeController = new AttributeController(attributeService);

export { AttributeRepository, AttributeService, AttributeController };
