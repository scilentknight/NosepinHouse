import { userController } from "@/modules/user";

export async function GET() {
  return userController.getAdminProfile();
}

export async function PUT(request) {
  return userController.updateAdminProfile(request);
}
