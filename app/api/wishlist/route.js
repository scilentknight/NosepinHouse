import { wishlistController } from "@/modules/wishlist";

export async function GET() {
  return wishlistController.getWishlistLines();
}

export async function POST(request) {
  return wishlistController.addToWishlist(request);
}

export async function DELETE(request) {
  return wishlistController.removeFromWishlist(request);
}
