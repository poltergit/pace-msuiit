import { createNotification, logActivity } from './notification.service.js';

export async function listCounselors({ db, page = 1, limit = 50 }) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  return db.counselorProfile.findMany({
    where: {
      user: { isActive: true }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true
        }
      },
      availabilities: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      }
    },
    skip,
    take
  });
}

export async function getCounselorAvailability({ db, counselorId }) {
  return db.counselorAvailability.findMany({
    where: { counselorId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  });
}

export async function setCounselorAvailability({ db, counselorUserId, slots }) {
  const counselor = await db.counselorProfile.findUnique({ where: { userId: counselorUserId } });
  if (!counselor) {
    const error = new Error('Counselor profile not found');
    error.status = 404;
    error.code = 'COUNSELOR_PROFILE_NOT_FOUND';
    throw error;
  }

  await db.counselorAvailability.deleteMany({
    where: { counselorId: counselor.id }
  });

  if (slots && slots.length > 0) {
    await db.counselorAvailability.createMany({
      data: slots.map(slot => ({
        counselorId: counselor.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isWalkIn: Boolean(slot.isWalkIn)
      }))
    });
  }

  return db.counselorAvailability.findMany({
    where: { counselorId: counselor.id },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  });
}

export async function createAppointment({ db, userId, data }) {
  const student = await db.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    const error = new Error('Student profile not found');
    error.status = 404;
    error.code = 'STUDENT_PROFILE_NOT_FOUND';
    throw error;
  }

  const appointmentDate = new Date(data.appointmentDate);

  const appointment = await db.appointment.create({
    data: {
      studentId: student.id,
      counselorId: data.counselorId || null,
      mentorId: data.mentorId || null,
      appointmentType: data.appointmentType,
      appointmentDate,
      startTime: data.startTime,
      endTime: data.endTime,
      notes: data.notes || null,
      status: 'scheduled'
    },
    include: {
      counselor: { include: { user: { select: { id: true, email: true } } } },
      mentor: { include: { user: { select: { id: true, email: true } } } },
      student: true
    }
  });

  // Notify the assigned counselor or mentor
  const targetUserId = appointment.counselor?.user?.id || appointment.mentor?.user?.id;
  if (targetUserId) {
    await createNotification({
      db,
      userId: targetUserId,
      type: 'NEW_APPOINTMENT_SCHEDULED',
      title: 'New Appointment Booked',
      message: `${student.firstName} ${student.lastName} booked a ${data.appointmentType} appointment.`,
      referenceType: 'Appointment',
      referenceId: appointment.id
    });
  }

  await logActivity({
    db,
    userId,
    action: 'APPOINTMENT_BOOKED',
    entityType: 'Appointment',
    entityId: appointment.id,
    metadata: { appointmentType: data.appointmentType, date: data.appointmentDate }
  });

  return appointment;
}

export async function listAppointments({ db, userId, userRole, status = null, page = 1, limit = 50 }) {
  const where = {};
  if (status) {
    where.status = status;
  }

  if (userRole === 'student') {
    const student = await db.studentProfile.findUnique({ where: { userId } });
    if (!student) return [];
    where.studentId = student.id;
  } else if (userRole === 'counselor') {
    const counselor = await db.counselorProfile.findUnique({ where: { userId } });
    if (!counselor) return [];
    where.counselorId = counselor.id;
  } else if (userRole === 'mentor') {
    const mentor = await db.mentorProfile.findUnique({ where: { userId } });
    if (!mentor) return [];
    where.mentorId = mentor.id;
  }
  // Admin sees all

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  return db.appointment.findMany({
    where,
    include: {
      student: true,
      counselor: {
        include: {
          user: { select: { email: true } }
        }
      },
      mentor: {
        include: {
          user: { select: { email: true } }
        }
      }
    },
    skip,
    take,
    orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }]
  });
}

export async function updateAppointment({ db, appointmentId, userId, userRole, data }) {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      student: true,
      counselor: true,
      mentor: true
    }
  });

  if (!appointment) {
    const error = new Error('Appointment not found');
    error.status = 404;
    error.code = 'APPOINTMENT_NOT_FOUND';
    throw error;
  }

  let authorized = false;
  if (userRole === 'admin' || userRole === 'superadmin') {
    authorized = true;
  } else if (userRole === 'counselor') {
    const counselor = await db.counselorProfile.findUnique({ where: { userId } });
    if (counselor && appointment.counselorId === counselor.id) authorized = true;
  } else if (userRole === 'mentor') {
    const mentor = await db.mentorProfile.findUnique({ where: { userId } });
    if (mentor && appointment.mentorId === mentor.id) authorized = true;
  } else if (userRole === 'student') {
    const student = await db.studentProfile.findUnique({ where: { userId } });
    if (student && appointment.studentId === student.id) {
      authorized = true;
      // Students can only cancel or update notes
      if (data.status && data.status !== 'cancelled') {
        const error = new Error('Students can only cancel appointments');
        error.status = 403;
        error.code = 'FORBIDDEN';
        throw error;
      }
    }
  }

  if (!authorized) {
    const error = new Error('You are not authorized to update this appointment');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const updated = await db.appointment.update({
    where: { id: appointmentId },
    data,
    include: {
      student: true,
      counselor: true,
      mentor: true
    }
  });

  // Notify counterparty if status was updated
  if (data.status) {
    const notifyUserId = userRole === 'student'
      ? (appointment.counselor?.userId || appointment.mentor?.userId)
      : appointment.student?.userId;

    if (notifyUserId) {
      await createNotification({
        db,
        userId: notifyUserId,
        type: 'APPOINTMENT_STATUS_UPDATED',
        title: 'Appointment Status Updated',
        message: `Appointment on ${appointment.appointmentDate.toISOString().slice(0, 10)} was changed to ${data.status}.`,
        referenceType: 'Appointment',
        referenceId: appointmentId
      });
    }
  }

  await logActivity({
    db,
    userId,
    action: 'APPOINTMENT_UPDATED',
    entityType: 'Appointment',
    entityId: appointmentId,
    metadata: { status: data.status }
  });

  return updated;
}
