import { attributeController } from "@/modules/attribute";

export async function POST(request, context) {
  return attributeController.createValue(request, context);
}
