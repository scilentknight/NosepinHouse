import { ok, handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

export default class WishlistController {
  constructor(wishlistService) {
    this.wishlistService = wishlistService;
  }

  async getWishlistLines() {
    try {
      const user = await requireUser();
      const lines = await this.wishlistService.getWishlistLines(user.id);
      return ok(lines);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async addToWishlist(request) {
    try {
      const user = await requireUser();
      const body = await request.json();
      const lines = await this.wishlistService.addToWishlist(user.id, body);
      return ok(lines);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async removeFromWishlist(request) {
    try {
      const user = await requireUser();
      const { searchParams } = new URL(request.url);
      const lines = await this.wishlistService.removeFromWishlist(user.id, searchParams);
      return ok(lines);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
