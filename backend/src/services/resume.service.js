import crypto from 'node:crypto';
import { createNotification, logActivity } from './notification.service.js';

export async function getStudentResumes({ db, userId, page = 1, limit = 50 }) {
  const student = await db.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    const error = new Error('Student profile not found');
    error.status = 404;
    error.code = 'STUDENT_PROFILE_NOT_FOUND';
    throw error;
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  return db.resume.findMany({
    where: { studentId: student.id },
    include: {
      counselor: {
        include: {
          user: { select: { email: true } }
        }
      },
      resumeReviews: {
        include: {
          counselor: {
            include: {
              user: { select: { email: true } }
            }
          }
        },
        orderBy: { reviewedAt: 'desc' }
      }
    },
    skip,
    take,
    orderBy: { uploadedAt: 'desc' }
  });
}

export async function createResume({ db, userId, fileUrl, version = '1.0' }) {
  const student = await db.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    const error = new Error('Student profile not found');
    error.status = 404;
    error.code = 'STUDENT_PROFILE_NOT_FOUND';
    throw error;
  }

  // Mark prior resumes as not current
  await db.resume.updateMany({
    where: { studentId: student.id, isCurrent: true },
    data: { isCurrent: false }
  });

  const resume = await db.resume.create({
    data: {
      studentId: student.id,
      fileUrl,
      version,
      isCurrent: true,
      isCounselorVerified: false
    }
  });

  await logActivity({
    db,
    userId,
    action: 'RESUME_UPLOADED',
    entityType: 'Resume',
    entityId: resume.id,
    metadata: { version }
  });

  return resume;
}

export async function verifyResumeByCode({ db, verificationCode }) {
  const resume = await db.resume.findUnique({
    where: { verificationCode },
    include: {
      student: true,
      counselor: {
        include: {
          user: { select: { email: true } }
        }
      }
    }
  });

  if (!resume || !resume.isCounselorVerified) {
    const error = new Error('Resume verification code is invalid or unverified');
    error.status = 404;
    error.code = 'VERIFICATION_CODE_INVALID';
    throw error;
  }

  return {
    verified: true,
    verificationCode: resume.verificationCode,
    verifiedAt: resume.verifiedAt,
    fileUrl: resume.fileUrl,
    version: resume.version,
    student: {
      firstName: resume.student.firstName,
      lastName: resume.student.lastName,
      course: resume.student.course,
      yearLevel: resume.student.yearLevel
    },
    counselor: resume.counselor ? {
      department: resume.counselor.department,
      employeeId: resume.counselor.employeeId
    } : null
  };
}

export async function listPendingResumes({ db, page = 1, limit = 50 }) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  return db.resume.findMany({
    where: { isCurrent: true },
    include: {
      student: {
        include: {
          user: { select: { email: true } }
        }
      },
      resumeReviews: {
        orderBy: { reviewedAt: 'desc' }
      }
    },
    skip,
    take,
    orderBy: { uploadedAt: 'desc' }
  });
}

export async function reviewResume({ db, resumeId, counselorUserId, rating, feedback, status = 'reviewed', verify = false }) {
  const counselor = await db.counselorProfile.findUnique({ where: { userId: counselorUserId } });
  if (!counselor) {
    const error = new Error('Counselor profile not found');
    error.status = 404;
    error.code = 'COUNSELOR_PROFILE_NOT_FOUND';
    throw error;
  }

  const resume = await db.resume.findUnique({
    where: { id: resumeId },
    include: { student: true }
  });

  if (!resume) {
    const error = new Error('Resume not found');
    error.status = 404;
    error.code = 'RESUME_NOT_FOUND';
    throw error;
  }

  const review = await db.resumeReview.create({
    data: {
      resumeId,
      counselorId: counselor.id,
      rating,
      feedback,
      status
    }
  });

  let updatedResume = resume;
  if (verify) {
    const verificationCode = `PACE-VERIFIED-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    updatedResume = await db.resume.update({
      where: { id: resumeId },
      data: {
        isCounselorVerified: true,
        counselorId: counselor.id,
        verificationCode,
        verifiedAt: new Date()
      }
    });
  }

  await createNotification({
    db,
    userId: resume.student.userId,
    type: 'RESUME_REVIEWED',
    title: verify ? 'Resume Verified by Counselor!' : 'New Resume Feedback Available',
    message: verify
      ? 'Your resume has been reviewed and officially verified by your career counselor.'
      : `Your counselor provided a ${rating}/5 review on your resume.`,
    referenceType: 'Resume',
    referenceId: resume.id
  });

  await logActivity({
    db,
    userId: counselorUserId,
    action: verify ? 'RESUME_VERIFIED' : 'RESUME_REVIEWED',
    entityType: 'ResumeReview',
    entityId: review.id,
    metadata: { resumeId, rating, verify }
  });

  return { review, resume: updatedResume };
}
