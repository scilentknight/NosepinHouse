import { prisma } from "@/lib/prisma";
import ContactRepository from "./repositories/ContactRepository";
import ContactService from "./services/ContactService";
import ContactController from "./controllers/ContactController";

export const contactRepository = new ContactRepository(prisma);
export const contactService = new ContactService(contactRepository);
export const contactController = new ContactController(contactService);

export { ContactRepository, ContactService, ContactController };
