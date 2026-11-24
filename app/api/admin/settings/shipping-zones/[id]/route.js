import { settingsController } from "@/modules/settings";

export async function PUT(request, { params }) {
  const { id: rawId } = await params;
  return settingsController.updateShippingZone(request, Number(rawId));
}

export async function DELETE(_request, { params }) {
  const { id: rawId } = await params;
  return settingsController.deleteShippingZone(Number(rawId));
}
