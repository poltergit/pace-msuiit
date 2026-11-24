import {
  updateUserStatusSchema,
  approvalSchema
} from '../schemas/admin.schemas.js';
import {
  listUsers as listUsersService,
  updateUserStatus as updateUserStatusService,
  listPendingRecruiters as listPendingRecruitersService,
  approveRecruiter as approveRecruiterService,
  listPendingMentors as listPendingMentorsService,
  approveMentor as approveMentorService,
  getAnalytics as getAnalyticsService,
  listActivityLogs as listActivityLogsService,
  listStudentsTalent as listStudentsTalentService
} from '../services/admin.service.js';

export function createAdminController({ db }) {
  async function listUsers(req, res, next) {
    try {
      const result = await listUsersService({
        db,
        role: req.query.role || null,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : null,
        search: req.query.search || null,
        page: req.query.page ? parseInt(req.query.page, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async function updateUserStatus(req, res, next) {
    try {
      const parsed = updateUserStatusSchema.parse(req.body);
      const user = await updateUserStatusService({
        db,
        targetUserId: req.params.id,
        isActive: parsed.isActive,
        adminUserId: req.user.id
      });
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }

  async function listPendingRecruiters(req, res, next) {
    try {
      const recruiters = await listPendingRecruitersService({
        db,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ recruiters });
    } catch (error) {
      next(error);
    }
  }

  async function approveRecruiter(req, res, next) {
    try {
      const parsed = approvalSchema.parse(req.body);
      const recruiter = await approveRecruiterService({
        db,
        recruiterId: req.params.id,
        approvalStatus: parsed.approvalStatus,
        adminUserId: req.user.id
      });
      res.json({ recruiter });
    } catch (error) {
      next(error);
    }
  }

  async function listPendingMentors(req, res, next) {
    try {
      const mentors = await listPendingMentorsService({
        db,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ mentors });
    } catch (error) {
      next(error);
    }
  }

  async function approveMentor(req, res, next) {
    try {
      const parsed = approvalSchema.parse(req.body);
      const mentor = await approveMentorService({
        db,
        mentorId: req.params.id,
        approvalStatus: parsed.approvalStatus,
        adminUserId: req.user.id
      });
      res.json({ mentor });
    } catch (error) {
      next(error);
    }
  }

  async function getAnalytics(req, res, next) {
    try {
      const analytics = await getAnalyticsService({ db });
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }

  async function listLogs(req, res, next) {
    try {
      const logs = await listActivityLogsService({
        db,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 50
      });
      res.json({ logs });
    } catch (error) {
      next(error);
    }
  }

  async function listTalent(req, res, next) {
    try {
      const result = await listStudentsTalentService({
        db,
        search: req.query.search || null,
        course: req.query.course || null,
        yearLevel: req.query.yearLevel ? parseInt(req.query.yearLevel, 10) : null,
        careerStatus: req.query.careerStatus || null,
        page: req.query.page ? parseInt(req.query.page, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  return {
    listUsers,
    updateUserStatus,
    listPendingRecruiters,
    approveRecruiter,
    listPendingMentors,
    approveMentor,
    getAnalytics,
    listLogs,
    listTalent
  };
}
