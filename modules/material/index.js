import { prisma } from "@/lib/prisma";
import MaterialRepository from "./repositories/MaterialRepository";
import MaterialService from "./services/MaterialService";
import MaterialController from "./controllers/MaterialController";

export const materialRepository = new MaterialRepository(prisma);
export const materialService = new MaterialService(materialRepository);
export const materialController = new MaterialController(materialService);

export { MaterialRepository, MaterialService, MaterialController };
