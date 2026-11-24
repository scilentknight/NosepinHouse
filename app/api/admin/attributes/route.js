import { attributeController } from "@/modules/attribute";

export async function GET() {
  return attributeController.getAll();
}

export async function POST(request) {
  return attributeController.create(request);
}
