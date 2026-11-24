import { ok, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

const RANGE_DAYS = new Set([7, 30, 90]);

export default class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
  }

  async getDashboard(request) {
    try {
      await requireAdmin();
      const requested = Number(new URL(request.url).searchParams.get("range"));
      const rangeDays = RANGE_DAYS.has(requested) ? requested : 30;
      const data = await this.dashboardService.getDashboardData(rangeDays);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
