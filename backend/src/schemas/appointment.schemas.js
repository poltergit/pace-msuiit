import { z } from 'zod';

export const createAppointmentSchema = z.object({
  counselorId: z.string().uuid().optional().nullable(),
  mentorId: z.string().uuid().optional().nullable(),
  appointmentType: z.string().min(2).max(100),
  appointmentDate: z.string().min(1),
  startTime: z.string().min(1).max(20),
  endTime: z.string().min(1).max(20),
  notes: z.string().max(2000).optional().nullable()
}).refine(data => Boolean(data.counselorId || data.mentorId), {
  message: 'Either counselorId or mentorId must be provided'
});

export const updateAppointmentSchema = z.object({
  status: z.enum(['scheduled', 'pending', 'completed', 'cancelled']).optional(),
  notes: z.string().max(2000).optional().nullable()
});

export const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1).max(10),
  endTime: z.string().min(1).max(10),
  isWalkIn: z.boolean().optional().default(false)
});

export const setAvailabilitySchema = z.object({
  slots: z.array(availabilitySlotSchema)
});
