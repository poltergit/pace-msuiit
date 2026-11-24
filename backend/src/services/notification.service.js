export async function listNotifications({ db, userId, unreadOnly = false }) {
  const where = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  return db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50
  });
}

export async function markNotificationRead({ db, notificationId, userId }) {
  const notification = await db.notification.findFirst({
    where: { id: notificationId, userId }
  });

  if (!notification) {
    const error = new Error('Notification not found');
    error.status = 404;
    error.code = 'NOTIFICATION_NOT_FOUND';
    throw error;
  }

  return db.notification.update({
    where: { id: notificationId },
    data: { isRead: true }
  });
}

export async function markAllNotificationsRead({ db, userId }) {
  return db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
}

export async function createNotification({ db, userId, type, title, message, referenceType = null, referenceId = null }) {
  try {
    return await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        referenceType,
        referenceId
      }
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
}

export async function logActivity({ db, userId, action, entityType, entityId = null, metadata = null }) {
  try {
    return await db.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ? metadata : undefined
      }
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
    return null;
  }
}
