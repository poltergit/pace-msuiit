import { createResumeSchema, reviewResumeSchema } from '../schemas/resume.schemas.js';
import {
  getStudentResumes as getStudentResumesService,
  createResume as createResumeService,
  verifyResumeByCode as verifyResumeByCodeService,
  listPendingResumes as listPendingResumesService,
  reviewResume as reviewResumeService
} from '../services/resume.service.js';

export function createResumeController({ db }) {
  async function getMyResumes(req, res, next) {
    try {
      const resumes = await getStudentResumesService({
        db,
        userId: req.user.id,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ resumes });
    } catch (error) {
      next(error);
    }
  }

  async function uploadResume(req, res, next) {
    try {
      const parsed = createResumeSchema.parse(req.body);
      const resume = await createResumeService({
        db,
        userId: req.user.id,
        fileUrl: parsed.fileUrl,
        version: parsed.version
      });
      res.status(201).json({ resume });
    } catch (error) {
      next(error);
    }
  }

  async function verifyResumeCode(req, res, next) {
    try {
      const result = await verifyResumeByCodeService({
        db,
        verificationCode: req.params.code
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async function listPendingResumes(req, res, next) {
    try {
      const resumes = await listPendingResumesService({
        db,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ resumes });
    } catch (error) {
      next(error);
    }
  }

  async function reviewResume(req, res, next) {
    try {
      const parsed = reviewResumeSchema.parse(req.body);
      const result = await reviewResumeService({
        db,
        resumeId: req.params.id,
        counselorUserId: req.user.id,
        rating: parsed.rating,
        feedback: parsed.feedback,
        status: parsed.status,
        verify: parsed.verify
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  return {
    getMyResumes,
    uploadResume,
    verifyResumeCode,
    listPendingResumes,
    reviewResume
  };
}
