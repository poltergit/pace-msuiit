import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import { createRateLimiter } from '../middleware/rate-limiter.js';

export function createAuthRouter({ db, config, auth }) {
  const router = Router();
  const controller = createAuthController({ db, config });

  // Rate limiter for authentication attempts (50 attempts per 15 minutes in production)
  const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many authentication attempts, please try again later.'
  });

  router.post('/register/student', authRateLimiter, controller.registerStudent);
  router.post('/register/counselor', authRateLimiter, controller.registerCounselor);
  router.post('/register/recruiter', authRateLimiter, controller.registerRecruiter);
  router.post('/register/admin', authRateLimiter, controller.registerAdmin);
  router.post('/login', authRateLimiter, controller.login);
  router.post('/logout', auth.optionalAuth, controller.logout);
  router.get('/me', auth.optionalAuth, controller.getCurrentUser);
  router.post(
    '/invitations',
    auth.optionalAuth,
    auth.requireRole('admin', 'superadmin'),
    authRateLimiter,
    controller.createUserInvitation
  );
  router.get(
    '/admin-check',
    auth.optionalAuth,
    auth.requireRole('admin', 'superadmin'),
    controller.adminCheck
  );

  return router;
}
