import { Router } from 'express';
import { createAdminController } from '../controllers/admin.controller.js';

export function createAdminRouter({ db, auth }) {
  const router = Router();
  const controller = createAdminController({ db });

  // System Analytics
  router.get(
    '/analytics',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('admin', 'superadmin'),
    controller.getAnalytics
  );

  // System Logs
  router.get(
    '/logs',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('admin', 'superadmin'),
    controller.listLogs
  );

  // User Management
  router.get(
    '/users',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('admin', 'superadmin'),
    controller.listUsers
  );

  router.patch(
    '/users/:id/status',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('admin', 'superadmin'),
    controller.updateUserStatus
  );

  // Pending Recruiter Approvals
  router.get(
    '/recruiters/pending',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('admin', 'superadmin'),
    controller.listPendingRecruiters
  );

  router.patch(
    '/recruiters/:id/approval',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('admin', 'superadmin'),
    controller.approveRecruiter
  );

  // Pending Mentor Approvals
  router.get(
    '/mentors/pending',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('admin', 'superadmin'),
    controller.listPendingMentors
  );

  router.patch(
    '/mentors/:id/approval',
    auth.optionalAuth,
    auth.requireAuth,
    auth.requireRole('admin', 'superadmin'),
    controller.approveMentor
  );

  return router;
}
