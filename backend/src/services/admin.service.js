import { createNotification, logActivity } from './notification.service.js';

export async function listUsers({ db, role = null, isActive = null, search = null, page = 1, limit = 20 }) {
  const where = {};

  if (isActive !== null && isActive !== undefined) {
    where.isActive = isActive;
  }

  if (role) {
    where.role = { name: role };
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { studentProfile: { firstName: { contains: search, mode: 'insensitive' } } },
      { studentProfile: { lastName: { contains: search, mode: 'insensitive' } } },
      { recruiterProfile: { firstName: { contains: search, mode: 'insensitive' } } },
      { recruiterProfile: { lastName: { contains: search, mode: 'insensitive' } } },
      { mentorProfile: { firstName: { contains: search, mode: 'insensitive' } } },
      { mentorProfile: { lastName: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        role: { select: { name: true } },
        studentProfile: true,
        counselorProfile: true,
        recruiterProfile: { include: { company: true } },
        mentorProfile: true
      }
    })
  ]);

  return {
    users,
    pagination: {
      total,
      page: Number(page),
      limit: Number(take),
      totalPages: Math.ceil(total / take)
    }
  };
}

export async function updateUserStatus({ db, targetUserId, isActive, adminUserId }) {
  const user = await db.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const updated = await db.user.update({
    where: { id: targetUserId },
    data: { isActive },
    select: {
      id: true,
      email: true,
      isActive: true,
      role: { select: { name: true } }
    }
  });

  await logActivity({
    db,
    userId: adminUserId,
    action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    entityType: 'User',
    entityId: targetUserId,
    metadata: { newStatus: isActive }
  });

  return updated;
}

export async function listPendingRecruiters({ db, page = 1, limit = 50 }) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  return db.recruiterProfile.findMany({
    where: { approvalStatus: 'pending' },
    include: {
      company: true,
      user: {
        select: { id: true, email: true, isActive: true, createdAt: true }
      }
    },
    skip,
    take,
    orderBy: { user: { createdAt: 'desc' } }
  });
}

export async function approveRecruiter({ db, recruiterId, approvalStatus, adminUserId }) {
  const recruiter = await db.recruiterProfile.findUnique({
    where: { id: recruiterId },
    include: { company: true, user: true }
  });

  if (!recruiter) {
    const error = new Error('Recruiter profile not found');
    error.status = 404;
    error.code = 'RECRUITER_NOT_FOUND';
    throw error;
  }

  const updated = await db.recruiterProfile.update({
    where: { id: recruiterId },
    data: { approvalStatus },
    include: { company: true }
  });

  if (approvalStatus === 'approved') {
    await db.company.update({
      where: { id: recruiter.companyId },
      data: { verificationStatus: 'verified' }
    });
  }

  await createNotification({
    db,
    userId: recruiter.userId,
    type: 'RECRUITER_APPROVAL_STATUS',
    title: `Recruiter Account ${approvalStatus === 'approved' ? 'Approved' : 'Status Updated'}`,
    message: approvalStatus === 'approved'
      ? 'Congratulations! Your recruiter account has been approved. You can now post jobs.'
      : `Your recruiter registration status is now: ${approvalStatus}.`,
    referenceType: 'RecruiterProfile',
    referenceId: recruiterId
  });

  await logActivity({
    db,
    userId: adminUserId,
    action: `RECRUITER_${approvalStatus.toUpperCase()}`,
    entityType: 'RecruiterProfile',
    entityId: recruiterId,
    metadata: { companyId: recruiter.companyId, approvalStatus }
  });

  return updated;
}

export async function listPendingMentors({ db, page = 1, limit = 50 }) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  return db.mentorProfile.findMany({
    where: { approvalStatus: 'pending' },
    include: {
      user: {
        select: { id: true, email: true, isActive: true, createdAt: true }
      }
    },
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });
}

export async function approveMentor({ db, mentorId, approvalStatus, adminUserId }) {
  const mentor = await db.mentorProfile.findUnique({
    where: { id: mentorId },
    include: { user: true }
  });

  if (!mentor) {
    const error = new Error('Mentor profile not found');
    error.status = 404;
    error.code = 'MENTOR_NOT_FOUND';
    throw error;
  }

  const updated = await db.mentorProfile.update({
    where: { id: mentorId },
    data: { approvalStatus }
  });

  await createNotification({
    db,
    userId: mentor.userId,
    type: 'MENTOR_APPROVAL_STATUS',
    title: `Mentor Account ${approvalStatus === 'approved' ? 'Approved' : 'Status Updated'}`,
    message: approvalStatus === 'approved'
      ? 'Congratulations! Your mentor account has been approved. You are now visible in the mentorship directory.'
      : `Your mentor application status is now: ${approvalStatus}.`,
    referenceType: 'MentorProfile',
    referenceId: mentorId
  });

  await logActivity({
    db,
    userId: adminUserId,
    action: `MENTOR_${approvalStatus.toUpperCase()}`,
    entityType: 'MentorProfile',
    entityId: mentorId,
    metadata: { approvalStatus }
  });

  return updated;
}

export async function getAnalytics({ db }) {
  const [
    totalStudents,
    totalCounselors,
    totalRecruiters,
    totalMentors,
    totalJobs,
    openJobs,
    totalApplications,
    acceptedApplications,
    scheduledAppointments,
    completedAppointments,
    pendingAppointments
  ] = await Promise.all([
    db.studentProfile.count(),
    db.counselorProfile.count(),
    db.recruiterProfile.count(),
    db.mentorProfile.count(),
    db.job.count(),
    db.job.count({ where: { status: 'open' } }),
    db.jobApplication.count(),
    db.jobApplication.count({ where: { status: 'accepted' } }),
    db.appointment.count({ where: { status: 'scheduled' } }),
    db.appointment.count({ where: { status: 'completed' } }),
    db.appointment.count({ where: { status: 'pending' } })
  ]);

  return {
    metrics: {
      totalStudents,
      totalCounselors,
      totalRecruiters,
      totalMentors,
      totalJobs,
      openJobs,
      totalApplications,
      candidatesHired: acceptedApplications,
      appointments: {
        scheduled: scheduledAppointments,
        completed: completedAppointments,
        pending: pendingAppointments,
        total: scheduledAppointments + completedAppointments + pendingAppointments
      }
    }
  };
}

export async function listActivityLogs({ db, limit = 50 }) {
  return db.activityLog.findMany({
    take: Math.min(100, Math.max(1, limit)),
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, email: true, role: { select: { name: true } } }
      }
    }
  });
}

export async function listStudentsTalent({ db, search = null, course = null, yearLevel = null, careerStatus = null, page = 1, limit = 20 }) {
  const where = {
    user: { isActive: true }
  };

  if (course) {
    where.course = { equals: course, mode: 'insensitive' };
  }

  if (yearLevel) {
    where.yearLevel = Number(yearLevel);
  }

  if (careerStatus) {
    where.careerStatus = { equals: careerStatus, mode: 'insensitive' };
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { bio: { contains: search, mode: 'insensitive' } },
      { course: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } }
    ];
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  const [total, students] = await Promise.all([
    db.studentProfile.count({ where }),
    db.studentProfile.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
        resumes: {
          where: { isCurrent: true },
          take: 1
        }
      }
    })
  ]);

  return {
    students,
    pagination: {
      total,
      page: Number(page),
      limit: Number(take),
      totalPages: Math.ceil(total / take)
    }
  };
}
