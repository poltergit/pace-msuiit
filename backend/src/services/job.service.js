import { createNotification, logActivity } from './notification.service.js';

export async function listJobs({ db, filters = {} }) {
  const { search, employmentType, location, status = 'open', page = 1, limit = 20 } = filters;
  const where = {};

  if (status && status !== 'all') {
    where.status = status;
  }

  if (employmentType) {
    where.employmentType = { equals: employmentType, mode: 'insensitive' };
  }

  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { requirements: { contains: search, mode: 'insensitive' } },
      { company: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  const [total, jobs] = await Promise.all([
    db.job.count({ where }),
    db.job.findMany({
      where,
      skip,
      take,
      orderBy: { postedAt: 'desc' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
            location: true,
            website: true,
            verificationStatus: true
          }
        },
        _count: {
          select: { applications: true }
        }
      }
    })
  ]);

  return {
    jobs,
    pagination: {
      total,
      page: Number(page),
      limit: Number(take),
      totalPages: Math.ceil(total / take)
    }
  };
}

export async function getJobById({ db, id, userId = null }) {
  const job = await db.job.findUnique({
    where: { id },
    include: {
      company: true,
      _count: {
        select: { applications: true, savedByStudents: true }
      }
    }
  });

  if (!job) {
    const error = new Error('Job not found');
    error.status = 404;
    error.code = 'JOB_NOT_FOUND';
    throw error;
  }

  let isSaved = false;
  let hasApplied = false;

  if (userId) {
    const student = await db.studentProfile.findUnique({ where: { userId } });
    if (student) {
      const [saved, application] = await Promise.all([
        db.savedJob.findUnique({
          where: {
            studentId_jobId: { studentId: student.id, jobId: id }
          }
        }),
        db.jobApplication.findUnique({
          where: {
            jobId_studentId: { jobId: id, studentId: student.id }
          }
        })
      ]);
      isSaved = Boolean(saved);
      hasApplied = Boolean(application);
    }
  }

  return { ...job, isSaved, hasApplied };
}

export async function createJob({ db, userId, userRole, data }) {
  let companyId = data.companyId;

  if (userRole === 'recruiter') {
    const recruiter = await db.recruiterProfile.findUnique({ where: { userId } });
    if (!recruiter) {
      const error = new Error('Recruiter profile not found');
      error.status = 404;
      error.code = 'RECRUITER_PROFILE_NOT_FOUND';
      throw error;
    }
    companyId = recruiter.companyId;
  }

  if (!companyId) {
    const error = new Error('Company ID is required to post a job');
    error.status = 400;
    error.code = 'COMPANY_ID_REQUIRED';
    throw error;
  }

  const job = await db.job.create({
    data: {
      companyId,
      postedById: userId,
      title: data.title,
      description: data.description,
      requirements: data.requirements || null,
      employmentType: data.employmentType,
      location: data.location,
      salaryRange: data.salaryRange || null,
      applicationDeadline: data.applicationDeadline ? new Date(data.applicationDeadline) : null,
      status: 'open'
    },
    include: {
      company: true
    }
  });

  await logActivity({
    db,
    userId,
    action: 'JOB_CREATED',
    entityType: 'Job',
    entityId: job.id,
    metadata: { title: job.title, companyId }
  });

  return job;
}

export async function updateJob({ db, jobId, userId, userRole, data }) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) {
    const error = new Error('Job not found');
    error.status = 404;
    error.code = 'JOB_NOT_FOUND';
    throw error;
  }

  if (userRole !== 'admin' && userRole !== 'superadmin' && job.postedById !== userId) {
    const error = new Error('You are not authorized to update this job');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const updateData = { ...data };
  if (updateData.applicationDeadline) {
    updateData.applicationDeadline = new Date(updateData.applicationDeadline);
  }

  return db.job.update({
    where: { id: jobId },
    data: updateData,
    include: { company: true }
  });
}

export async function deleteJob({ db, jobId, userId, userRole }) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) {
    const error = new Error('Job not found');
    error.status = 404;
    error.code = 'JOB_NOT_FOUND';
    throw error;
  }

  if (userRole !== 'admin' && userRole !== 'superadmin' && job.postedById !== userId) {
    const error = new Error('You are not authorized to delete this job');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  try {
    return await db.job.delete({ where: { id: jobId } });
  } catch (err) {
    // If foreign keys prevent delete, mark as closed
    return await db.job.update({
      where: { id: jobId },
      data: { status: 'closed' }
    });
  }
}

export async function saveJob({ db, userId, jobId }) {
  const student = await db.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    const error = new Error('Student profile not found');
    error.status = 404;
    error.code = 'STUDENT_PROFILE_NOT_FOUND';
    throw error;
  }

  return db.savedJob.upsert({
    where: {
      studentId_jobId: { studentId: student.id, jobId }
    },
    create: {
      studentId: student.id,
      jobId
    },
    update: {}
  });
}

export async function unsaveJob({ db, userId, jobId }) {
  const student = await db.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    const error = new Error('Student profile not found');
    error.status = 404;
    error.code = 'STUDENT_PROFILE_NOT_FOUND';
    throw error;
  }

  try {
    await db.savedJob.delete({
      where: {
        studentId_jobId: { studentId: student.id, jobId }
      }
    });
    return { success: true };
  } catch (err) {
    return { success: true };
  }
}

export async function listSavedJobs({ db, userId, page = 1, limit = 50 }) {
  const student = await db.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    const error = new Error('Student profile not found');
    error.status = 404;
    error.code = 'STUDENT_PROFILE_NOT_FOUND';
    throw error;
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  const saved = await db.savedJob.findMany({
    where: { studentId: student.id },
    include: {
      job: {
        include: {
          company: true,
          _count: { select: { applications: true } }
        }
      }
    },
    skip,
    take,
    orderBy: { savedAt: 'desc' }
  });

  return saved.map(s => s.job);
}

export async function applyToJob({ db, userId, jobId, coverLetter, resumeId }) {
  const student = await db.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    const error = new Error('Student profile not found');
    error.status = 404;
    error.code = 'STUDENT_PROFILE_NOT_FOUND';
    throw error;
  }

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) {
    const error = new Error('Job not found');
    error.status = 404;
    error.code = 'JOB_NOT_FOUND';
    throw error;
  }

  if (job.status !== 'open') {
    const error = new Error('This job is no longer accepting applications');
    error.status = 400;
    error.code = 'JOB_CLOSED';
    throw error;
  }

  const existingApplication = await db.jobApplication.findUnique({
    where: {
      jobId_studentId: { jobId, studentId: student.id }
    }
  });

  if (existingApplication) {
    const error = new Error('You have already applied for this job');
    error.status = 409;
    error.code = 'ALREADY_APPLIED';
    throw error;
  }

  let finalResumeId = resumeId || null;
  if (!finalResumeId) {
    const currentResume = await db.resume.findFirst({
      where: { studentId: student.id, isCurrent: true },
      orderBy: { uploadedAt: 'desc' }
    });
    if (currentResume) {
      finalResumeId = currentResume.id;
    }
  }

  const application = await db.jobApplication.create({
    data: {
      jobId,
      studentId: student.id,
      resumeId: finalResumeId,
      coverLetter: coverLetter || null,
      status: 'submitted'
    },
    include: {
      job: { include: { company: true } },
      resume: true
    }
  });

  await createNotification({
    db,
    userId: job.postedById,
    type: 'NEW_JOB_APPLICATION',
    title: 'New Application Received',
    message: `${student.firstName} ${student.lastName} applied for ${job.title}`,
    referenceType: 'JobApplication',
    referenceId: application.id
  });

  await logActivity({
    db,
    userId,
    action: 'JOB_APPLICATION_SUBMITTED',
    entityType: 'JobApplication',
    entityId: application.id,
    metadata: { jobId, studentId: student.id }
  });

  return application;
}

export async function listJobApplications({ db, jobId, userId, userRole, page = 1, limit = 50 }) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) {
    const error = new Error('Job not found');
    error.status = 404;
    error.code = 'JOB_NOT_FOUND';
    throw error;
  }

  if (userRole !== 'admin' && userRole !== 'superadmin' && job.postedById !== userId) {
    const error = new Error('You are not authorized to view applicants for this job');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  return db.jobApplication.findMany({
    where: { jobId },
    include: {
      student: {
        include: {
          user: {
            select: { email: true, createdAt: true }
          }
        }
      },
      resume: true
    },
    skip,
    take,
    orderBy: { appliedAt: 'desc' }
  });
}

export async function listStudentApplications({ db, userId, page = 1, limit = 50 }) {
  const student = await db.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    const error = new Error('Student profile not found');
    error.status = 404;
    error.code = 'STUDENT_PROFILE_NOT_FOUND';
    throw error;
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  return db.jobApplication.findMany({
    where: { studentId: student.id },
    include: {
      job: {
        include: {
          company: true
        }
      },
      resume: true
    },
    skip,
    take,
    orderBy: { appliedAt: 'desc' }
  });
}

export async function updateApplicationStatus({ db, applicationId, userId, userRole, status }) {
  const application = await db.jobApplication.findUnique({
    where: { id: applicationId },
    include: {
      job: true,
      student: true
    }
  });

  if (!application) {
    const error = new Error('Application not found');
    error.status = 404;
    error.code = 'APPLICATION_NOT_FOUND';
    throw error;
  }

  if (userRole !== 'admin' && userRole !== 'superadmin' && application.job.postedById !== userId) {
    const error = new Error('You are not authorized to update this application');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const updated = await db.jobApplication.update({
    where: { id: applicationId },
    data: { status },
    include: {
      job: { include: { company: true } },
      student: true
    }
  });

  await createNotification({
    db,
    userId: application.student.userId,
    type: 'APPLICATION_STATUS_UPDATED',
    title: 'Application Status Updated',
    message: `Your application for ${application.job.title} was updated to ${status}.`,
    referenceType: 'JobApplication',
    referenceId: applicationId
  });

  await logActivity({
    db,
    userId,
    action: 'APPLICATION_STATUS_UPDATED',
    entityType: 'JobApplication',
    entityId: applicationId,
    metadata: { newStatus: status }
  });

  return updated;
}
