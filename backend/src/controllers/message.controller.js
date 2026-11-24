import {
  createConversationSchema,
  sendMessageSchema
} from '../schemas/message.schemas.js';
import {
  listConversations as listConversationsService,
  getOrCreateConversation as getOrCreateConversationService,
  getConversationMessages as getConversationMessagesService,
  sendMessage as sendMessageService,
  markConversationAsRead as markConversationAsReadService
} from '../services/message.service.js';

export function createMessageController({ db }) {
  async function listConversations(req, res, next) {
    try {
      const conversations = await listConversationsService({
        db,
        userId: req.user.id,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ conversations });
    } catch (error) {
      next(error);
    }
  }

  async function startConversation(req, res, next) {
    try {
      const parsed = createConversationSchema.parse(req.body);
      const conversation = await getOrCreateConversationService({
        db,
        userId: req.user.id,
        recipientId: parsed.recipientId
      });
      res.json({ conversation });
    } catch (error) {
      next(error);
    }
  }

  async function getMessages(req, res, next) {
    try {
      const result = await getConversationMessagesService({
        db,
        conversationId: req.params.id,
        userId: req.user.id,
        page: req.query.page ? parseInt(req.query.page, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 50
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async function sendMessage(req, res, next) {
    try {
      const parsed = sendMessageSchema.parse(req.body);
      const message = await sendMessageService({
        db,
        conversationId: req.params.id,
        senderId: req.user.id,
        content: parsed.content
      });
      res.status(201).json({ message });
    } catch (error) {
      next(error);
    }
  }

  async function markAsRead(req, res, next) {
    try {
      await markConversationAsReadService({
        db,
        conversationId: req.params.id,
        userId: req.user.id
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  return {
    listConversations,
    startConversation,
    getMessages,
    sendMessage,
    markAsRead
  };
}
