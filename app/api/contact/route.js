import { contactController } from "@/modules/contact";

export const runtime = "nodejs";

export async function GET(request) {
  return contactController.getMessages(request);
}

export async function POST(request) {
  return contactController.createMessage(request);
}
