import { z } from 'zod';

export const createConversationSchema = z.object({
  recipientId: z.string().uuid()
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000)
});
