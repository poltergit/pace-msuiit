import { Router } from 'express';
import { createMentorshipController } from '../controllers/mentorship.controller.js';

export function createMentorshipRouter({ db, auth }) {
  const router = Router();
  const controller = createMentorshipController({ db });

  // List mentors directory
  router.get('/mentors', auth.optionalAuth, controller.listMentors);

  // Student requests mentorship
  router.post(
    '/requests',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('student'),
    controller.requestMentorship
  );

  // List mentorship requests (student gets theirs, mentor gets theirs, admin gets all)
  router.get(
    '/requests',
    auth.optionalAuth,
    auth.requireAuth,
    controller.listRequests
  );

  // Mentor / Admin responds to request
  router.patch(
    '/requests/:id',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('mentor', 'admin', 'superadmin'),
    controller.respondRequest
  );

  // List active mentorships
  router.get(
    '/',
    auth.optionalAuth,
    auth.requireAuth,
    controller.listMentorships
  );

  return router;
}
