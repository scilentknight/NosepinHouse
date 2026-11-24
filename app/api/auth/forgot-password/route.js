import { authController } from "@/modules/auth";

export async function POST(request) {
  return authController.forgotPassword(request);
}
