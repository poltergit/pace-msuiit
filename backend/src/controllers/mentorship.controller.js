import {
  requestMentorshipSchema,
  respondMentorshipRequestSchema
} from '../schemas/mentorship.schemas.js';
import {
  listMentors as listMentorsService,
  createMentorshipRequest as createMentorshipRequestService,
  listMentorshipRequests as listMentorshipRequestsService,
  respondMentorshipRequest as respondMentorshipRequestService,
  listMentorships as listMentorshipsService
} from '../services/mentorship.service.js';

export function createMentorshipController({ db }) {
  async function listMentors(req, res, next) {
    try {
      const mentors = await listMentorsService({
        db,
        status: req.query.status || 'approved',
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ mentors });
    } catch (error) {
      next(error);
    }
  }

  async function requestMentorship(req, res, next) {
    try {
      const parsed = requestMentorshipSchema.parse(req.body);
      const request = await createMentorshipRequestService({
        db,
        userId: req.user.id,
        mentorId: parsed.mentorId,
        message: parsed.message
      });
      res.status(201).json({ request });
    } catch (error) {
      next(error);
    }
  }

  async function listRequests(req, res, next) {
    try {
      const requests = await listMentorshipRequestsService({
        db,
        userId: req.user.id,
        userRole: req.user.role,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ requests });
    } catch (error) {
      next(error);
    }
  }

  async function respondRequest(req, res, next) {
    try {
      const parsed = respondMentorshipRequestSchema.parse(req.body);
      const result = await respondMentorshipRequestService({
        db,
        requestId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        data: parsed
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async function listMentorships(req, res, next) {
    try {
      const mentorships = await listMentorshipsService({
        db,
        userId: req.user.id,
        userRole: req.user.role,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ mentorships });
    } catch (error) {
      next(error);
    }
  }

  return {
    listMentors,
    requestMentorship,
    listRequests,
    respondRequest,
    listMentorships
  };
}
