import { z } from "zod";

export const updateStudentProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  studentNumber: z.string().trim().min(1).max(50).optional(),
  course: z.string().trim().min(1).max(150).optional(),
  yearLevel: z.number().int().min(1).max(10).optional(),
  gpa: z.number().min(0).max(5).optional().nullable(),
  phone: z.string().trim().min(7).max(30).optional(),
  address: z.string().trim().min(1).max(300).optional(),
  bio: z.string().trim().max(1000).optional().nullable(),
  location: z.string().trim().max(150).optional().nullable(),
  careerStatus: z.string().trim().max(100).optional().nullable()
}).strict().refine((profile) => Object.keys(profile).length > 0, {
  message: "At least one profile field is required"
});
