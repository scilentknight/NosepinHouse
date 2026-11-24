import { ok, handleApiError } from "@/lib/api";
import { requireUser, requireAdmin } from "@/lib/session";

export default class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  async getProfile() {
    try {
      const sessionUser = await requireUser();
      const user = await this.userService.getProfile(sessionUser.id);
      return ok(user);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateProfile(request) {
    try {
      const sessionUser = await requireUser();
      const body = await request.json();
      const user = await this.userService.updateProfile(sessionUser.id, body);
      return ok(user, "Profile updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getAdminProfile() {
    try {
      const admin = await requireAdmin();
      const user = await this.userService.getAdminProfile(admin.id);
      return ok(user);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateAdminProfile(request) {
    try {
      const admin = await requireAdmin();
      const body = await request.json();
      const user = await this.userService.updateAdminProfile(admin.id, body);
      return ok(user, "Profile updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async changeAdminPassword(request) {
    try {
      const admin = await requireAdmin();
      const body = await request.json();
      await this.userService.changeAdminPassword(admin.id, body);
      return ok(null, "Password changed successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getCustomers(request) {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const data = await this.userService.getCustomers(searchParams);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getCustomerById(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const customer = await this.userService.getCustomerById(id);
      return ok(customer);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateCustomer(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const customer = await this.userService.updateCustomer(id, body);
      return ok(customer, "Customer updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async patchCustomer(request, { params }) {
    try {
      await requireAdmin();
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const customer = await this.userService.patchCustomer(id, body);
      return ok(customer, "Customer updated");
    } catch (error) {
      return handleApiError(error);
    }
  }
}
