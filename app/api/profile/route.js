import { userController } from "@/modules/user";

export async function GET() {
  return userController.getProfile();
}

export async function PUT(request) {
  return userController.updateProfile(request);
}
