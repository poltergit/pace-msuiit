import { Router } from 'express';
import { createResumeController } from '../controllers/resume.controller.js';

export function createResumeRouter({ db, auth }) {
  const router = Router();
  const controller = createResumeController({ db });

  // Public verification endpoint
  router.get('/verify/:code', controller.verifyResumeCode);

  // Student get and upload resume
  router.get(
    '/me',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('student'),
    controller.getMyResumes
  );

  router.post(
    '/',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('student'),
    controller.uploadResume
  );

  // Counselor / Admin view pending resumes
  router.get(
    '/pending',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('counselor', 'admin', 'superadmin'),
    controller.listPendingResumes
  );

  // Counselor / Admin review/verify resume
  router.post(
    '/:id/review',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('counselor', 'admin', 'superadmin'),
    controller.reviewResume
  );

  return router;
}
