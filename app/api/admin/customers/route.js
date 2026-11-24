import { userController } from "@/modules/user";

export async function GET(request) {
  return userController.getCustomers(request);
}
