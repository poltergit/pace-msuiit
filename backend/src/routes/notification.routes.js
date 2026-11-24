import { Router } from 'express';
import { createNotificationController } from '../controllers/notification.controller.js';

export function createNotificationRouter({ db, auth }) {
  const router = Router();
  const controller = createNotificationController({ db });

  router.get(
    '/',
    auth.optionalAuth,
    auth.requireAuth,
    controller.listNotifications
  );

  router.patch(
    '/read-all',
    auth.optionalAuth,
    auth.requireAuth,
    controller.markAllAsRead
  );

  router.patch(
    '/:id/read',
    auth.optionalAuth,
    auth.requireAuth,
    controller.markAsRead
  );

  return router;
}
