import { z } from 'zod';

export const createJobSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(10),
  requirements: z.string().optional().nullable(),
  employmentType: z.string().min(2).max(50),
  location: z.string().min(2).max(150),
  salaryRange: z.string().max(100).optional().nullable(),
  applicationDeadline: z.string().optional().nullable(),
  companyId: z.string().uuid().optional()
});

export const updateJobSchema = createJobSchema.partial().extend({
  status: z.enum(['open', 'closed', 'paused']).optional()
});

export const applyJobSchema = z.object({
  coverLetter: z.string().max(5000).optional().nullable(),
  resumeId: z.string().uuid().optional().nullable()
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['submitted', 'reviewing', 'shortlisted', 'interview', 'accepted', 'rejected'])
});
