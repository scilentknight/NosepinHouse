import { prisma } from "@/lib/prisma";
import NotificationRepository from "./repositories/NotificationRepository";
import NotificationService from "./services/NotificationService";
import NotificationController from "./controllers/NotificationController";

export const notificationRepository = new NotificationRepository(prisma);
export const notificationService = new NotificationService(notificationRepository);
export const notificationController = new NotificationController(notificationService);

export { NotificationRepository, NotificationService, NotificationController };
