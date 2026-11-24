import { addressController } from "@/modules/address";

export const revalidate = 86400;

export async function GET() {
  return addressController.getAddressBook();
}
