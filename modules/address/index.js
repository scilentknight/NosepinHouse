import { prisma } from "@/lib/prisma";
import AddressRepository from "./repositories/AddressRepository";
import AddressService from "./services/AddressService";
import AddressController from "./controllers/AddressController";

export const addressRepository = new AddressRepository(prisma);
export const addressService = new AddressService(addressRepository);
export const addressController = new AddressController(addressService);

export { AddressRepository, AddressService, AddressController };
