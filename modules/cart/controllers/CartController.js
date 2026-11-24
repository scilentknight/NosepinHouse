import { ok, handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

export default class CartController {
  constructor(cartService) {
    this.cartService = cartService;
  }

  async getCartLines() {
    try {
      const user = await requireUser();
      const lines = await this.cartService.getCartLines(user.id);
      return ok(lines);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async addToCart(request) {
    try {
      const user = await requireUser();
      const body = await request.json();
      const lines = await this.cartService.addToCart(user.id, body);
      return ok(lines);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async updateCartItem(request) {
    try {
      const user = await requireUser();
      const body = await request.json();
      const lines = await this.cartService.updateCartItem(user.id, body);
      return ok(lines);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async removeCartItem(request) {
    try {
      const user = await requireUser();
      const { searchParams } = new URL(request.url);
      const lines = await this.cartService.removeCartItem(user.id, searchParams);
      return ok(lines);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async mergeCart(request) {
    try {
      const user = await requireUser();
      const body = await request.json();
      await this.cartService.mergeCart(user.id, body);
      return ok(null, "Cart merged");
    } catch (error) {
      return handleApiError(error);
    }
  }
}
