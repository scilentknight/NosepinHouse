import { contactController } from "@/modules/contact";

export const runtime = "nodejs";

export async function GET(request, context) {
  return contactController.getMessageById(request, context);
}

export async function PATCH(request, context) {
  return contactController.updateStatus(request, context);
}

export async function DELETE(request, context) {
  return contactController.deleteMessage(request, context);
}
