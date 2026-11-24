import { Router } from 'express';
import { createJobController } from '../controllers/job.controller.js';

export function createJobRouter({ db, auth }) {
  const router = Router();
  const controller = createJobController({ db });

  // Public/all users can view jobs and job details
  router.get('/', auth.optionalAuth, controller.listJobs);

  // Authenticated student routes for applications and saved jobs
  router.get(
    '/saved',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('student'),
    controller.listSavedJobs
  );

  router.get(
    '/applications',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('student'),
    controller.listStudentApplications
  );

  router.get('/:id', auth.optionalAuth, controller.getJob);

  // Recruiter/Admin creates jobs
  router.post(
    '/',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('recruiter', 'admin', 'superadmin'),
    controller.createJob
  );

  // Recruiter/Admin updates jobs
  router.patch(
    '/:id',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('recruiter', 'admin', 'superadmin'),
    controller.updateJob
  );

  // Recruiter/Admin deletes jobs
  router.delete(
    '/:id',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('recruiter', 'admin', 'superadmin'),
    controller.deleteJob
  );

  // Student save/unsave
  router.post(
    '/:id/save',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('student'),
    controller.saveJob
  );

  router.delete(
    '/:id/save',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('student'),
    controller.unsaveJob
  );

  // Student apply
  router.post(
    '/:id/apply',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('student'),
    controller.applyToJob
  );

  // Recruiter/Admin view applicants for a job
  router.get(
    '/:id/applications',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('recruiter', 'admin', 'superadmin'),
    controller.listJobApplications
  );

  // Recruiter/Admin update application status
  router.patch(
    '/applications/:id/status',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('recruiter', 'admin', 'superadmin'),
    controller.updateApplicationStatus
  );

  return router;
}
