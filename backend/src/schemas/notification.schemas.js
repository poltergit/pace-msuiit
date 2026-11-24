import { z } from 'zod';

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(150),
  message: z.string().min(1).max(1000),
  referenceType: z.string().max(50).optional().nullable(),
  referenceId: z.string().uuid().optional().nullable()
});
