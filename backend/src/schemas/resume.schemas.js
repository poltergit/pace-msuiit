import { z } from 'zod';

export const createResumeSchema = z.object({
  fileUrl: z.string().min(1).max(1000),
  version: z.string().max(20).optional().default('1.0')
});

export const reviewResumeSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().min(3).max(5000),
  status: z.enum(['reviewed', 'needs_revision', 'approved']).optional().default('reviewed'),
  verify: z.boolean().optional().default(false)
});
