import { addressController } from "@/modules/address";

export async function PUT(request, context) {
  return addressController.updateAddress(request, context);
}

export async function DELETE(request, context) {
  return addressController.deleteAddress(request, context);
}

export async function PATCH(request, context) {
  return addressController.patchAddress(request, context);
}
