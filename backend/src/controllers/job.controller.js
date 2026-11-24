import {
  createJobSchema,
  updateJobSchema,
  applyJobSchema,
  updateApplicationStatusSchema
} from '../schemas/job.schemas.js';
import {
  listJobs as listJobsService,
  getJobById as getJobByIdService,
  createJob as createJobService,
  updateJob as updateJobService,
  deleteJob as deleteJobService,
  saveJob as saveJobService,
  unsaveJob as unsaveJobService,
  listSavedJobs as listSavedJobsService,
  applyToJob as applyToJobService,
  listJobApplications as listJobApplicationsService,
  listStudentApplications as listStudentApplicationsService,
  updateApplicationStatus as updateApplicationStatusService
} from '../services/job.service.js';

export function createJobController({ db }) {
  async function listJobs(req, res, next) {
    try {
      const filters = {
        search: req.query.search,
        employmentType: req.query.employmentType || req.query.type,
        location: req.query.location,
        status: req.query.status,
        page: req.query.page ? parseInt(req.query.page, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20
      };
      const result = await listJobsService({ db, filters });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async function getJob(req, res, next) {
    try {
      const job = await getJobByIdService({
        db,
        id: req.params.id,
        userId: req.user?.id || null
      });
      res.json({ job });
    } catch (error) {
      next(error);
    }
  }

  async function createJob(req, res, next) {
    try {
      const parsed = createJobSchema.parse(req.body);
      const job = await createJobService({
        db,
        userId: req.user.id,
        userRole: req.user.role,
        data: parsed
      });
      res.status(201).json({ job });
    } catch (error) {
      next(error);
    }
  }

  async function updateJob(req, res, next) {
    try {
      const parsed = updateJobSchema.parse(req.body);
      const job = await updateJobService({
        db,
        jobId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        data: parsed
      });
      res.json({ job });
    } catch (error) {
      next(error);
    }
  }

  async function deleteJob(req, res, next) {
    try {
      await deleteJobService({
        db,
        jobId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role
      });
      res.json({ message: 'Job removed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async function saveJob(req, res, next) {
    try {
      const saved = await saveJobService({
        db,
        userId: req.user.id,
        jobId: req.params.id
      });
      res.json({ message: 'Job saved', saved });
    } catch (error) {
      next(error);
    }
  }

  async function unsaveJob(req, res, next) {
    try {
      await unsaveJobService({
        db,
        userId: req.user.id,
        jobId: req.params.id
      });
      res.json({ message: 'Job unsaved' });
    } catch (error) {
      next(error);
    }
  }

  async function listSavedJobs(req, res, next) {
    try {
      const jobs = await listSavedJobsService({
        db,
        userId: req.user.id,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ jobs });
    } catch (error) {
      next(error);
    }
  }

  async function applyToJob(req, res, next) {
    try {
      const parsed = applyJobSchema.parse(req.body);
      const application = await applyToJobService({
        db,
        userId: req.user.id,
        jobId: req.params.id,
        coverLetter: parsed.coverLetter,
        resumeId: parsed.resumeId
      });
      res.status(201).json({ application });
    } catch (error) {
      next(error);
    }
  }

  async function listJobApplications(req, res, next) {
    try {
      const applications = await listJobApplicationsService({
        db,
        jobId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ applications });
    } catch (error) {
      next(error);
    }
  }

  async function listStudentApplications(req, res, next) {
    try {
      const applications = await listStudentApplicationsService({
        db,
        userId: req.user.id,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ applications });
    } catch (error) {
      next(error);
    }
  }

  async function updateApplicationStatus(req, res, next) {
    try {
      const parsed = updateApplicationStatusSchema.parse(req.body);
      const application = await updateApplicationStatusService({
        db,
        applicationId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        status: parsed.status
      });
      res.json({ application });
    } catch (error) {
      next(error);
    }
  }

  return {
    listJobs,
    getJob,
    createJob,
    updateJob,
    deleteJob,
    saveJob,
    unsaveJob,
    listSavedJobs,
    applyToJob,
    listJobApplications,
    listStudentApplications,
    updateApplicationStatus
  };
}
