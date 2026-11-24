import { userController } from "@/modules/user";

export async function GET(request, context) {
  return userController.getCustomerById(request, context);
}

export async function PUT(request, context) {
  return userController.updateCustomer(request, context);
}

export async function PATCH(request, context) {
  return userController.patchCustomer(request, context);
}
