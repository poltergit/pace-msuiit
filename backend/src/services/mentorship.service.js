import { createNotification, logActivity } from './notification.service.js';

export async function listMentors({ db, status = 'approved', page = 1, limit = 50 }) {
  const where = {
    user: { isActive: true }
  };
  if (status && status !== 'all') {
    where.approvalStatus = status;
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  return db.mentorProfile.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true
        }
      },
      _count: {
        select: {
          mentorships: { where: { status: 'active' } }
        }
      }
    },
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });
}

export async function createMentorshipRequest({ db, userId, mentorId, message }) {
  const student = await db.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    const error = new Error('Student profile not found');
    error.status = 404;
    error.code = 'STUDENT_PROFILE_NOT_FOUND';
    throw error;
  }

  const mentor = await db.mentorProfile.findUnique({
    where: { id: mentorId },
    include: {
      user: true,
      _count: {
        select: { mentorships: { where: { status: 'active' } } }
      }
    }
  });

  if (!mentor || mentor.approvalStatus !== 'approved') {
    const error = new Error('Mentor not found or not currently active');
    error.status = 404;
    error.code = 'MENTOR_NOT_FOUND';
    throw error;
  }

  if (mentor._count.mentorships >= mentor.maxMentees) {
    const error = new Error('This mentor has reached their maximum number of mentees');
    error.status = 400;
    error.code = 'MENTOR_CAPACITY_REACHED';
    throw error;
  }

  const existing = await db.mentorshipRequest.findFirst({
    where: {
      studentId: student.id,
      mentorId,
      status: 'pending'
    }
  });

  if (existing) {
    const error = new Error('You already have a pending mentorship request with this mentor');
    error.status = 409;
    error.code = 'PENDING_REQUEST_EXISTS';
    throw error;
  }

  const request = await db.mentorshipRequest.create({
    data: {
      studentId: student.id,
      mentorId,
      initiatedById: userId,
      message,
      status: 'pending'
    },
    include: {
      mentor: true,
      student: true
    }
  });

  await createNotification({
    db,
    userId: mentor.userId,
    type: 'NEW_MENTORSHIP_REQUEST',
    title: 'New Mentorship Request',
    message: `${student.firstName} ${student.lastName} requested you as a career mentor.`,
    referenceType: 'MentorshipRequest',
    referenceId: request.id
  });

  await logActivity({
    db,
    userId,
    action: 'MENTORSHIP_REQUESTED',
    entityType: 'MentorshipRequest',
    entityId: request.id,
    metadata: { mentorId }
  });

  return request;
}

export async function listMentorshipRequests({ db, userId, userRole, page = 1, limit = 50 }) {
  const where = {};

  if (userRole === 'student') {
    const student = await db.studentProfile.findUnique({ where: { userId } });
    if (!student) return [];
    where.studentId = student.id;
  } else if (userRole === 'mentor') {
    const mentor = await db.mentorProfile.findUnique({ where: { userId } });
    if (!mentor) return [];
    where.mentorId = mentor.id;
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  return db.mentorshipRequest.findMany({
    where,
    include: {
      student: true,
      mentor: true
    },
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });
}

export async function respondMentorshipRequest({ db, requestId, userId, userRole, data }) {
  const request = await db.mentorshipRequest.findUnique({
    where: { id: requestId },
    include: {
      student: true,
      mentor: true
    }
  });

  if (!request) {
    const error = new Error('Mentorship request not found');
    error.status = 404;
    error.code = 'REQUEST_NOT_FOUND';
    throw error;
  }

  if (userRole !== 'admin' && userRole !== 'superadmin') {
    const mentor = await db.mentorProfile.findUnique({ where: { userId } });
    if (!mentor || request.mentorId !== mentor.id) {
      const error = new Error('You are not authorized to respond to this request');
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  const updatedRequest = await db.mentorshipRequest.update({
    where: { id: requestId },
    data: {
      status: data.status,
      responseMessage: data.responseMessage || null,
      respondedAt: new Date()
    }
  });

  let mentorship = null;
  if (data.status === 'accepted') {
    mentorship = await db.mentorship.create({
      data: {
        requestId: request.id,
        studentId: request.studentId,
        mentorId: request.mentorId,
        status: 'active',
        goals: data.goals || null,
        meetingFrequency: data.meetingFrequency || null,
        startedAt: new Date()
      }
    });
  }

  await createNotification({
    db,
    userId: request.student.userId,
    type: 'MENTORSHIP_REQUEST_RESPONDED',
    title: data.status === 'accepted' ? 'Mentorship Request Accepted!' : 'Mentorship Request Update',
    message: data.status === 'accepted'
      ? `${request.mentor.firstName} ${request.mentor.lastName} accepted your mentorship request!`
      : `${request.mentor.firstName} ${request.mentor.lastName} declined your mentorship request.`,
    referenceType: 'MentorshipRequest',
    referenceId: requestId
  });

  await logActivity({
    db,
    userId,
    action: `MENTORSHIP_${data.status.toUpperCase()}`,
    entityType: 'MentorshipRequest',
    entityId: requestId,
    metadata: { status: data.status }
  });

  return { request: updatedRequest, mentorship };
}

export async function listMentorships({ db, userId, userRole, page = 1, limit = 50 }) {
  const where = { status: 'active' };

  if (userRole === 'student') {
    const student = await db.studentProfile.findUnique({ where: { userId } });
    if (!student) return [];
    where.studentId = student.id;
  } else if (userRole === 'mentor') {
    const mentor = await db.mentorProfile.findUnique({ where: { userId } });
    if (!mentor) return [];
    where.mentorId = mentor.id;
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  return db.mentorship.findMany({
    where,
    include: {
      student: true,
      mentor: true,
      appointments: {
        orderBy: { appointmentDate: 'desc' }
      }
    },
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });
}
