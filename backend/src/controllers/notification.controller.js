import {
  listNotifications as listNotificationsService,
  markNotificationRead as markNotificationReadService,
  markAllNotificationsRead as markAllNotificationsReadService
} from '../services/notification.service.js';

export function createNotificationController({ db }) {
  async function listNotifications(req, res, next) {
    try {
      const unreadOnly = req.query.unread === 'true';
      const notifications = await listNotificationsService({
        db,
        userId: req.user.id,
        unreadOnly
      });
      res.json({ notifications });
    } catch (error) {
      next(error);
    }
  }

  async function markAsRead(req, res, next) {
    try {
      const notification = await markNotificationReadService({
        db,
        notificationId: req.params.id,
        userId: req.user.id
      });
      res.json({ notification });
    } catch (error) {
      next(error);
    }
  }

  async function markAllAsRead(req, res, next) {
    try {
      await markAllNotificationsReadService({
        db,
        userId: req.user.id
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  return {
    listNotifications,
    markAsRead,
    markAllAsRead
  };
}
