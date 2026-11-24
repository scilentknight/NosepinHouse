import { addressController } from "@/modules/address";

export async function GET() {
  return addressController.getUserAddresses();
}

export async function POST(request) {
  return addressController.createAddress(request);
}
