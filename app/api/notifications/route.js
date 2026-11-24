import { notificationController } from "@/modules/notification";

export async function GET() {
  return notificationController.getUserNotifications();
}

export async function PATCH(request) {
  return notificationController.markAsRead(request);
}
