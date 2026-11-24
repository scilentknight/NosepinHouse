import { dashboardController } from "@/modules/dashboard";

export async function GET(request) {
  return dashboardController.getDashboard(request);
}
