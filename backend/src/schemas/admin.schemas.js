import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  isActive: z.boolean()
});

export const approvalSchema = z.object({
  approvalStatus: z.enum(['approved', 'rejected', 'pending']),
  reason: z.string().max(500).optional().nullable()
});
