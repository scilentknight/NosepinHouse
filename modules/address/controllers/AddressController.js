import { ok, handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

export default class AddressController {
  constructor(addressService) {
    this.addressService = addressService;
  }

  async getUserAddresses() {
    try {
      const user = await requireUser();
      const addresses = await this.addressService.getUserAddresses(user.id);
      return ok(addresses);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async createAddress(request) {
    try {
      const user = await requireUser();
      const body = await request.json();
      const address = await this.addressService.createAddress(user.id, body);
      return ok(address, "Address saved");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateAddress(request, { params }) {
    try {
      const user = await requireUser();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const address = await this.addressService.updateAddress(user.id, id, body);
      return ok(address, "Address updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async deleteAddress(request, { params }) {
    try {
      const user = await requireUser();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.addressService.deleteAddress(user.id, id);
      return ok(null, "Address removed");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async patchAddress(request, { params }) {
    try {
      const user = await requireUser();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const updated = await this.addressService.setDefaultAddress(user.id, id, body.isDefault);
      return ok(updated, "Address updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getAddressBook() {
    try {
      const data = await this.addressService.getAddressBookTree();
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
