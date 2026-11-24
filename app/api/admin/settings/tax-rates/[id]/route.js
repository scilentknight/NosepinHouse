import { settingsController } from "@/modules/settings";

export async function PUT(request, { params }) {
  const { id: rawId } = await params;
  return settingsController.updateTaxRate(request, Number(rawId));
}

export async function PATCH(request, { params }) {
  const { id: rawId } = await params;
  return settingsController.toggleTaxRateActive(request, Number(rawId));
}

export async function DELETE(_request, { params }) {
  const { id: rawId } = await params;
  return settingsController.deleteTaxRate(Number(rawId));
}
