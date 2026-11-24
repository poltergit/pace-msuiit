import { Router } from 'express';
import { createAppointmentController } from '../controllers/appointment.controller.js';

export function createAppointmentRouter({ db, auth }) {
  const router = Router();
  const controller = createAppointmentController({ db });

  // List counselors and their availability (students, counselors, admins)
  router.get('/counselors', auth.optionalAuth, controller.listCounselors);
  router.get('/counselors/:counselorId/availability', auth.optionalAuth, controller.getCounselorAvailability);

  // Counselor manage own availability
  router.put(
    '/availability',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('counselor'),
    controller.setMyAvailability
  );

  // Student books appointment
  router.post(
    '/',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('student'),
    controller.bookAppointment
  );

  // Authenticated user lists appointments (filtered by their role/user)
  router.get(
    '/',
    auth.optionalAuth,
    auth.requireAuth,
    controller.listAppointments
  );

  // Update appointment (status, notes)
  router.patch(
    '/:id',
    auth.optionalAuth,
    auth.requireAuth,
    controller.updateAppointment
  );

  return router;
}
