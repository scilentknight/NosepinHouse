import { ok, handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

export default class NotificationController {
  constructor(notificationService) {
    this.notificationService = notificationService;
  }

  async getUserNotifications() {
    try {
      const user = await requireUser();
      const notifications = await this.notificationService.getUserNotifications(user.id);
      return ok(notifications);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async markAsRead(request) {
    try {
      const user = await requireUser();
      const body = await request.json().catch(() => ({}));
      const { id } = body;
      const result = await this.notificationService.markAsRead(user.id, id);
      return ok(null, result.message);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
