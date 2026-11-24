import { userController } from "@/modules/user";

export async function POST(request) {
  return userController.changeAdminPassword(request);
}
