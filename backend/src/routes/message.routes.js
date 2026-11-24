import { Router } from 'express';
import { createMessageController } from '../controllers/message.controller.js';

export function createMessageRouter({ db, auth }) {
  const router = Router();
  const controller = createMessageController({ db });

  // List conversations
  router.get(
    '/',
    auth.optionalAuth,
    auth.requireAuth,
    controller.listConversations
  );

  // Start or open conversation
  router.post(
    '/',
    auth.optionalAuth,
    auth.requireAuth,
    controller.startConversation
  );

  // Get messages in a conversation
  router.get(
    '/:id/messages',
    auth.optionalAuth,
    auth.requireAuth,
    controller.getMessages
  );

  // Send message in conversation
  router.post(
    '/:id/messages',
    auth.optionalAuth,
    auth.requireAuth,
    controller.sendMessage
  );

  // Mark conversation as read
  router.patch(
    '/:id/read',
    auth.optionalAuth,
    auth.requireAuth,
    controller.markAsRead
  );

  return router;
}
