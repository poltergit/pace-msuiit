import { z } from 'zod';

export const requestMentorshipSchema = z.object({
  mentorId: z.string().uuid(),
  message: z.string().min(5).max(3000)
});

export const respondMentorshipRequestSchema = z.object({
  status: z.enum(['accepted', 'declined']),
  responseMessage: z.string().max(2000).optional().nullable(),
  goals: z.string().max(2000).optional().nullable(),
  meetingFrequency: z.string().max(100).optional().nullable()
});
