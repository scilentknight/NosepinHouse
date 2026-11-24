import { prisma } from "@/lib/prisma";
import CouponRepository from "./repositories/CouponRepository";
import CouponService from "./services/CouponService";
import CouponController from "./controllers/CouponController";

export const couponRepository = new CouponRepository(prisma);
export const couponService = new CouponService(couponRepository);
export const couponController = new CouponController(couponService);

export { CouponRepository, CouponService, CouponController };
