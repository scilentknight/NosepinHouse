export default class NotificationService {
  constructor(notificationRepository) {
    this.notificationRepository = notificationRepository;
  }

  async getUserNotifications(userId) {
    return this.notificationRepository.findUserNotifications(userId);
  }

  async markAsRead(userId, id = null) {
    await this.notificationRepository.markAsRead(userId, id);
    return { message: "Marked as read" };
  }
}
