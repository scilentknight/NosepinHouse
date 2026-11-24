import { cartController } from "@/modules/cart";

export async function GET() {
  return cartController.getCartLines();
}

export async function POST(request) {
  return cartController.addToCart(request);
}

export async function PATCH(request) {
  return cartController.updateCartItem(request);
}

export async function DELETE(request) {
  return cartController.removeCartItem(request);
}
