import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../src/app.js';
import { hashPassword, createSession } from '../src/services/auth.service.js';

const config = {
  sessionTtlMs: 60_000,
  cookieSecure: false,
  allowedOrigins: ['http://localhost:3001']
};

function createMockDb() {
  const roles = [
    { id: crypto.randomUUID(), name: 'student' },
    { id: crypto.randomUUID(), name: 'counselor' },
    { id: crypto.randomUUID(), name: 'recruiter' },
    { id: crypto.randomUUID(), name: 'mentor' },
    { id: crypto.randomUUID(), name: 'admin' },
    { id: crypto.randomUUID(), name: 'superadmin' }
  ];

  const users = [];
  const sessions = new Map();
  const studentProfiles = [];
  const counselorProfiles = [];
  const recruiterProfiles = [];
  const mentorProfiles = [];
  const companies = [];
  const jobs = [];
  const savedJobs = [];
  const jobApplications = [];
  const resumes = [];
  const resumeReviews = [];
  const appointments = [];
  const counselorAvailabilities = [];
  const mentorshipRequests = [];
  const mentorships = [];
  const conversations = [];
  const messages = [];
  const notifications = [];
  const activityLogs = [];

  const db = {
    roles,
    users,
    sessions,
    studentProfiles,
    counselorProfiles,
    recruiterProfiles,
    mentorProfiles,
    companies,
    jobs,
    savedJobs,
    jobApplications,
    resumes,
    resumeReviews,
    appointments,
    counselorAvailabilities,
    mentorshipRequests,
    mentorships,
    conversations,
    messages,
    notifications,
    activityLogs,

    $queryRaw: async () => [{ '?column?': 1 }],
    $disconnect: async () => {},
    $transaction: async (cb) => cb(db),

    user: {
      create: async ({ data }) => {
        let roleName = typeof data.role === 'string' ? data.role : data.role?.connect?.name;
        const roleObj = roles.find((r) => r.name === (roleName || 'student'));
        const user = {
          id: crypto.randomUUID(),
          email: data.email,
          passwordHash: data.passwordHash || null,
          roleId: roleObj.id,
          role: roleObj,
          isActive: data.isActive ?? true,
          createdAt: new Date().toISOString()
        };
        users.push(user);
        return user;
      },
      findUnique: async ({ where }) => users.find((u) => u.id === where.id),
      findFirst: async ({ where }) => users.find((u) => (!where.email || u.email === where.email) && (where.isActive === undefined || u.isActive === where.isActive)),
      findMany: async ({ where = {}, skip = 0, take = 50 }) => {
        let res = users.filter(u => {
          if (where.isActive !== undefined && u.isActive !== where.isActive) return false;
          if (where.role?.name && u.role.name !== where.role.name) return false;
          return true;
        });
        return res.slice(skip, skip + take).map(u => ({
          ...u,
          studentProfile: studentProfiles.find(s => s.userId === u.id),
          counselorProfile: counselorProfiles.find(c => c.userId === u.id),
          recruiterProfile: recruiterProfiles.find(r => r.userId === u.id),
          mentorProfile: mentorProfiles.find(m => m.userId === u.id)
        }));
      },
      count: async () => users.length,
      update: async ({ where, data }) => {
        const u = users.find(x => x.id === where.id);
        if (!u) throw new Error('User not found');
        Object.assign(u, data);
        return u;
      }
    },

    session: {
      create: async ({ data }) => {
        sessions.set(data.tokenHash, data);
      },
      findFirst: async ({ where }) => {
        const sess = sessions.get(where.tokenHash);
        if (!sess || new Date(sess.expiresAt) <= new Date()) return null;
        const user = users.find(u => u.id === sess.userId);
        if (!user || !user.isActive) return null;
        return { ...sess, user: { ...user, role: user.role } };
      },
      deleteMany: async () => ({ count: 1 })
    },

    studentProfile: {
      create: async ({ data }) => {
        const profile = { id: crypto.randomUUID(), ...data, createdAt: new Date() };
        studentProfiles.push(profile);
        return profile;
      },
      findUnique: async ({ where }) => studentProfiles.find(s => s.userId === where.userId || s.id === where.id),
      findMany: async ({ skip = 0, take = 50 }) => studentProfiles.slice(skip, skip + take).map(s => ({
        ...s,
        user: users.find(u => u.id === s.userId),
        resumes: resumes.filter(r => r.studentId === s.id && r.isCurrent)
      })),
      count: async () => studentProfiles.length,
      update: async ({ where, data }) => {
        const s = studentProfiles.find(x => x.userId === where.userId || x.id === where.id);
        if (!s) { const err = new Error('Record not found'); err.code = 'P2025'; throw err; }
        Object.assign(s, data);
        return s;
      }
    },

    counselorProfile: {
      create: async ({ data }) => {
        const profile = { id: crypto.randomUUID(), ...data };
        counselorProfiles.push(profile);
        return profile;
      },
      findUnique: async ({ where }) => counselorProfiles.find(c => c.userId === where.userId || c.id === where.id),
      findMany: async ({ skip = 0, take = 50 } = {}) => counselorProfiles.slice(skip, skip + take).map(c => ({
        ...c,
        user: users.find(u => u.id === c.userId),
        availabilities: counselorAvailabilities.filter(a => a.counselorId === c.id)
      })),
      count: async () => counselorProfiles.length,
      update: async ({ where, data }) => {
        const c = counselorProfiles.find(x => x.userId === where.userId || x.id === where.id);
        Object.assign(c, data);
        return c;
      }
    },

    recruiterProfile: {
      create: async ({ data }) => {
        const profile = { id: crypto.randomUUID(), approvalStatus: 'pending', ...data };
        recruiterProfiles.push(profile);
        return profile;
      },
      findUnique: async ({ where }) => {
        const r = recruiterProfiles.find(x => x.userId === where.userId || x.id === where.id);
        if (!r) return null;
        return { ...r, company: companies.find(c => c.id === r.companyId), user: users.find(u => u.id === r.userId) };
      },
      findMany: async ({ where = {}, skip = 0, take = 50 } = {}) => {
        return recruiterProfiles.filter(r => !where.approvalStatus || r.approvalStatus === where.approvalStatus).slice(skip, skip + take).map(r => ({
          ...r,
          company: companies.find(c => c.id === r.companyId),
          user: users.find(u => u.id === r.userId)
        }));
      },
      count: async () => recruiterProfiles.length,
      update: async ({ where, data }) => {
        const r = recruiterProfiles.find(x => x.id === where.id || x.userId === where.userId);
        Object.assign(r, data);
        return { ...r, company: companies.find(c => c.id === r.companyId) };
      }
    },

    mentorProfile: {
      create: async ({ data }) => {
        const profile = { id: crypto.randomUUID(), approvalStatus: 'approved', maxMentees: 3, ...data, createdAt: new Date() };
        mentorProfiles.push(profile);
        return profile;
      },
      findUnique: async ({ where }) => {
        const m = mentorProfiles.find(x => x.userId === where.userId || x.id === where.id);
        if (!m) return null;
        return {
          ...m,
          user: users.find(u => u.id === m.userId),
          _count: { mentorships: mentorships.filter(ms => ms.mentorId === m.id && ms.status === 'active').length }
        };
      },
      findMany: async ({ where = {}, skip = 0, take = 50 } = {}) => {
        return mentorProfiles.filter(m => !where.approvalStatus || m.approvalStatus === where.approvalStatus).slice(skip, skip + take).map(m => ({
          ...m,
          user: users.find(u => u.id === m.userId),
          _count: { mentorships: mentorships.filter(ms => ms.mentorId === m.id && ms.status === 'active').length }
        }));
      },
      count: async () => mentorProfiles.length,
      update: async ({ where, data }) => {
        const m = mentorProfiles.find(x => x.id === where.id || x.userId === where.userId);
        Object.assign(m, data);
        return m;
      }
    },

    company: {
      create: async ({ data }) => {
        const c = { id: crypto.randomUUID(), verificationStatus: 'pending', ...data };
        companies.push(c);
        return c;
      },
      findUnique: async ({ where }) => companies.find(c => c.id === where.id),
      update: async ({ where, data }) => {
        const c = companies.find(x => x.id === where.id);
        Object.assign(c, data);
        return c;
      }
    },

    job: {
      create: async ({ data }) => {
        const j = {
          id: crypto.randomUUID(),
          ...data,
          status: data.status || 'open',
          postedAt: new Date()
        };
        jobs.push(j);
        return { ...j, company: companies.find(c => c.id === j.companyId) };
      },
      findUnique: async ({ where }) => {
        const j = jobs.find(x => x.id === where.id);
        if (!j) return null;
        return {
          ...j,
          company: companies.find(c => c.id === j.companyId),
          _count: {
            applications: jobApplications.filter(a => a.jobId === j.id).length,
            savedByStudents: savedJobs.filter(s => s.jobId === j.id).length
          }
        };
      },
      findMany: async ({ skip = 0, take = 50 }) => {
        return jobs.slice(skip, skip + take).map(j => ({
          ...j,
          company: companies.find(c => c.id === j.companyId),
          _count: {
            applications: jobApplications.filter(a => a.jobId === j.id).length
          }
        }));
      },
      count: async ({ where = {} } = {}) => {
        return jobs.filter(j => !where.status || j.status === where.status).length;
      },
      update: async ({ where, data }) => {
        const j = jobs.find(x => x.id === where.id);
        Object.assign(j, data);
        return { ...j, company: companies.find(c => c.id === j.companyId) };
      },
      delete: async ({ where }) => {
        const idx = jobs.findIndex(x => x.id === where.id);
        if (idx !== -1) jobs.splice(idx, 1);
        return { success: true };
      }
    },

    savedJob: {
      create: async ({ data }) => { savedJobs.push(data); return data; },
      upsert: async ({ create }) => {
        if (!savedJobs.find(s => s.studentId === create.studentId && s.jobId === create.jobId)) {
          savedJobs.push(create);
        }
        return create;
      },
      findUnique: async ({ where }) => {
        const s = where.studentId_jobId;
        return savedJobs.find(x => x.studentId === s.studentId && x.jobId === s.jobId);
      },
      findMany: async ({ where }) => {
        return savedJobs.filter(s => s.studentId === where.studentId).map(s => ({
          ...s,
          job: {
            ...jobs.find(j => j.id === s.jobId),
            company: companies.find(c => c.id === jobs.find(j => j.id === s.jobId)?.companyId),
            _count: { applications: jobApplications.filter(a => a.jobId === s.jobId).length }
          }
        }));
      },
      delete: async ({ where }) => {
        const s = where.studentId_jobId;
        const idx = savedJobs.findIndex(x => x.studentId === s.studentId && x.jobId === s.jobId);
        if (idx !== -1) savedJobs.splice(idx, 1);
        return { success: true };
      }
    },

    jobApplication: {
      create: async ({ data }) => {
        const a = { id: crypto.randomUUID(), ...data, appliedAt: new Date() };
        jobApplications.push(a);
        return {
          ...a,
          job: { ...jobs.find(j => j.id === a.jobId), company: companies.find(c => c.id === jobs.find(j => j.id === a.jobId)?.companyId) },
          resume: resumes.find(r => r.id === a.resumeId)
        };
      },
      findUnique: async ({ where }) => {
        let a = null;
        if (where.id) a = jobApplications.find(x => x.id === where.id);
        else if (where.jobId_studentId) {
          const pair = where.jobId_studentId;
          a = jobApplications.find(x => x.jobId === pair.jobId && x.studentId === pair.studentId);
        }
        if (!a) return null;
        return {
          ...a,
          job: jobs.find(j => j.id === a.jobId),
          student: studentProfiles.find(s => s.id === a.studentId),
          resume: resumes.find(r => r.id === a.resumeId)
        };
      },
      findMany: async ({ where = {}, skip = 0, take = 50 } = {}) => {
        return jobApplications.filter(a => (!where.jobId || a.jobId === where.jobId) && (!where.studentId || a.studentId === where.studentId)).slice(skip, skip + take).map(a => ({
          ...a,
          job: { ...jobs.find(j => j.id === a.jobId), company: companies.find(c => c.id === jobs.find(j => j.id === a.jobId)?.companyId) },
          student: { ...studentProfiles.find(s => s.id === a.studentId), user: users.find(u => u.id === studentProfiles.find(s => s.id === a.studentId)?.userId) },
          resume: resumes.find(r => r.id === a.resumeId)
        }));
      },
      count: async ({ where = {} } = {}) => {
        return jobApplications.filter(a => !where.status || a.status === where.status).length;
      },
      update: async ({ where, data }) => {
        const a = jobApplications.find(x => x.id === where.id);
        Object.assign(a, data);
        return {
          ...a,
          job: { ...jobs.find(j => j.id === a.jobId), company: companies.find(c => c.id === jobs.find(j => j.id === a.jobId)?.companyId) },
          student: studentProfiles.find(s => s.id === a.studentId)
        };
      }
    },

    resume: {
      create: async ({ data }) => {
        const r = { id: crypto.randomUUID(), ...data, uploadedAt: new Date() };
        resumes.push(r);
        return r;
      },
      updateMany: async ({ where, data }) => {
        resumes.filter(r => r.studentId === where.studentId).forEach(r => Object.assign(r, data));
      },
      findUnique: async ({ where }) => {
        const r = resumes.find(x => x.id === where.id || x.verificationCode === where.verificationCode);
        if (!r) return null;
        return {
          ...r,
          student: studentProfiles.find(s => s.id === r.studentId),
          counselor: counselorProfiles.find(c => c.id === r.counselorId)
        };
      },
      findFirst: async ({ where }) => resumes.find(r => r.studentId === where.studentId && (!where.isCurrent || r.isCurrent)),
      findMany: async ({ where = {}, skip = 0, take = 50 } = {}) => {
        return resumes.filter(r => (!where.studentId || r.studentId === where.studentId) && (where.isCurrent === undefined || r.isCurrent === where.isCurrent)).slice(skip, skip + take).map(r => ({
          ...r,
          student: { ...studentProfiles.find(s => s.id === r.studentId), user: users.find(u => u.id === studentProfiles.find(s => s.id === r.studentId)?.userId) },
          counselor: counselorProfiles.find(c => c.id === r.counselorId),
          resumeReviews: resumeReviews.filter(rv => rv.resumeId === r.id)
        }));
      },
      update: async ({ where, data }) => {
        const r = resumes.find(x => x.id === where.id);
        Object.assign(r, data);
        return r;
      }
    },

    resumeReview: {
      create: async ({ data }) => {
        const rv = { id: crypto.randomUUID(), ...data, reviewedAt: new Date() };
        resumeReviews.push(rv);
        return rv;
      }
    },

    counselorAvailability: {
      deleteMany: async ({ where }) => {
        const remaining = counselorAvailabilities.filter(a => a.counselorId !== where.counselorId);
        counselorAvailabilities.length = 0;
        counselorAvailabilities.push(...remaining);
      },
      createMany: async ({ data }) => {
        data.forEach(d => counselorAvailabilities.push({ id: crypto.randomUUID(), ...d }));
      },
      findMany: async ({ where }) => counselorAvailabilities.filter(a => a.counselorId === where.counselorId)
    },

    appointment: {
      create: async ({ data }) => {
        const apt = { id: crypto.randomUUID(), ...data, createdAt: new Date() };
        appointments.push(apt);
        return {
          ...apt,
          student: studentProfiles.find(s => s.id === apt.studentId),
          counselor: counselorProfiles.find(c => c.id === apt.counselorId) ? {
            ...counselorProfiles.find(c => c.id === apt.counselorId),
            user: users.find(u => u.id === counselorProfiles.find(c => c.id === apt.counselorId).userId)
          } : null,
          mentor: mentorProfiles.find(m => m.id === apt.mentorId) ? {
            ...mentorProfiles.find(m => m.id === apt.mentorId),
            user: users.find(u => u.id === mentorProfiles.find(m => m.id === apt.mentorId).userId)
          } : null
        };
      },
      findUnique: async ({ where }) => {
        const apt = appointments.find(x => x.id === where.id);
        if (!apt) return null;
        return {
          ...apt,
          student: studentProfiles.find(s => s.id === apt.studentId),
          counselor: counselorProfiles.find(c => c.id === apt.counselorId),
          mentor: mentorProfiles.find(m => m.id === apt.mentorId)
        };
      },
      findMany: async ({ where = {}, skip = 0, take = 50 } = {}) => {
        return appointments.filter(a => {
          if (where.studentId && a.studentId !== where.studentId) return false;
          if (where.counselorId && a.counselorId !== where.counselorId) return false;
          if (where.mentorId && a.mentorId !== where.mentorId) return false;
          if (where.status && a.status !== where.status) return false;
          return true;
        }).slice(skip, skip + take).map(a => ({
          ...a,
          student: studentProfiles.find(s => s.id === a.studentId),
          counselor: counselorProfiles.find(c => c.id === a.counselorId),
          mentor: mentorProfiles.find(m => m.id === a.mentorId)
        }));
      },
      count: async ({ where = {} } = {}) => appointments.filter(a => !where.status || a.status === where.status).length,
      update: async ({ where, data }) => {
        const apt = appointments.find(x => x.id === where.id);
        Object.assign(apt, data);
        return {
          ...apt,
          student: studentProfiles.find(s => s.id === apt.studentId),
          counselor: counselorProfiles.find(c => c.id === apt.counselorId),
          mentor: mentorProfiles.find(m => m.id === apt.mentorId)
        };
      }
    },

    mentorshipRequest: {
      create: async ({ data }) => {
        const r = { id: crypto.randomUUID(), ...data, createdAt: new Date() };
        mentorshipRequests.push(r);
        return {
          ...r,
          mentor: mentorProfiles.find(m => m.id === r.mentorId),
          student: studentProfiles.find(s => s.id === r.studentId)
        };
      },
      findFirst: async ({ where }) => mentorshipRequests.find(r => r.studentId === where.studentId && r.mentorId === where.mentorId && r.status === where.status),
      findUnique: async ({ where }) => {
        const r = mentorshipRequests.find(x => x.id === where.id);
        if (!r) return null;
        return {
          ...r,
          mentor: mentorProfiles.find(m => m.id === r.mentorId),
          student: studentProfiles.find(s => s.id === r.studentId)
        };
      },
      findMany: async ({ where = {} }) => {
        return mentorshipRequests.filter(r => (!where.studentId || r.studentId === where.studentId) && (!where.mentorId || r.mentorId === where.mentorId)).map(r => ({
          ...r,
          student: studentProfiles.find(s => s.id === r.studentId),
          mentor: mentorProfiles.find(m => m.id === r.mentorId)
        }));
      },
      update: async ({ where, data }) => {
        const r = mentorshipRequests.find(x => x.id === where.id);
        Object.assign(r, data);
        return r;
      }
    },

    mentorship: {
      create: async ({ data }) => {
        const ms = { id: crypto.randomUUID(), ...data, createdAt: new Date() };
        mentorships.push(ms);
        return ms;
      },
      findMany: async ({ where = {} }) => {
        return mentorships.filter(ms => (!where.studentId || ms.studentId === where.studentId) && (!where.mentorId || ms.mentorId === where.mentorId)).map(ms => ({
          ...ms,
          student: studentProfiles.find(s => s.id === ms.studentId),
          mentor: mentorProfiles.find(m => m.id === ms.mentorId),
          appointments: []
        }));
      }
    },

    conversation: {
      create: async ({ data }) => {
        const conv = { id: crypto.randomUUID(), ...data, createdAt: new Date(), updatedAt: new Date() };
        conversations.push(conv);
        return {
          ...conv,
          participant1: users.find(u => u.id === conv.participant1Id),
          participant2: users.find(u => u.id === conv.participant2Id)
        };
      },
      findFirst: async ({ where }) => {
        return conversations.find(c => {
          for (const opt of where.OR) {
            if (c.participant1Id === opt.participant1Id && c.participant2Id === opt.participant2Id) return true;
          }
          return false;
        });
      },
      findUnique: async ({ where }) => conversations.find(c => c.id === where.id),
      findMany: async ({ where, skip = 0, take = 50 } = {}) => {
        const filtered = conversations.filter(c => c.participant1Id === where.OR[0].participant1Id || c.participant2Id === where.OR[1].participant2Id);
        return filtered.slice(skip, skip + take).map(c => ({
          ...c,
          participant1: users.find(u => u.id === c.participant1Id),
          participant2: users.find(u => u.id === c.participant2Id),
          messages: messages.filter(m => m.conversationId === c.id).slice(-1)
        }));
      },
      update: async ({ where, data }) => {
        const c = conversations.find(x => x.id === where.id);
        Object.assign(c, data);
        return c;
      }
    },

    message: {
      create: async ({ data }) => {
        const m = { id: crypto.randomUUID(), ...data, sentAt: new Date() };
        messages.push(m);
        return m;
      },
      count: async ({ where = {} } = {}) => {
        return messages.filter(m => m.conversationId === where.conversationId && (!where.isRead !== undefined || m.isRead === where.isRead) && (!where.senderId?.not || m.senderId !== where.senderId.not)).length;
      },
      groupBy: async ({ by, where = {} }) => {
        const matching = messages.filter(m => {
          if (where.conversationId?.in && !where.conversationId.in.includes(m.conversationId)) return false;
          if (where.senderId?.not && m.senderId === where.senderId.not) return false;
          if (where.isRead !== undefined && m.isRead !== where.isRead) return false;
          return true;
        });
        const map = new Map();
        for (const m of matching) {
          const key = m[by[0]];
          map.set(key, (map.get(key) || 0) + 1);
        }
        return Array.from(map.entries()).map(([k, count]) => ({
          [by[0]]: k,
          _count: { id: count }
        }));
      },
      findMany: async ({ where, skip = 0, take = 50 }) => {
        return messages.filter(m => m.conversationId === where.conversationId).slice(skip, skip + take).map(m => ({
          ...m,
          sender: users.find(u => u.id === m.senderId)
        }));
      },
      updateMany: async ({ where, data }) => {
        messages.filter(m => m.conversationId === where.conversationId && (!where.senderId?.not || m.senderId !== where.senderId.not)).forEach(m => Object.assign(m, data));
      }
    },

    notification: {
      create: async ({ data }) => {
        const n = { id: crypto.randomUUID(), ...data, isRead: false, createdAt: new Date() };
        notifications.push(n);
        return n;
      },
      findFirst: async ({ where }) => notifications.find(n => n.id === where.id && n.userId === where.userId),
      findMany: async ({ where = {} }) => {
        return notifications.filter(n => n.userId === where.userId && (where.isRead === undefined || n.isRead === where.isRead));
      },
      update: async ({ where, data }) => {
        const n = notifications.find(x => x.id === where.id);
        Object.assign(n, data);
        return n;
      },
      updateMany: async ({ where, data }) => {
        notifications.filter(n => n.userId === where.userId && (where.isRead === undefined || n.isRead === where.isRead)).forEach(n => Object.assign(n, data));
      }
    },

    activityLog: {
      create: async ({ data }) => {
        const l = { id: crypto.randomUUID(), ...data, createdAt: new Date() };
        activityLogs.push(l);
        return l;
      },
      findMany: async ({ take = 50 }) => activityLogs.slice(0, take).map(l => ({
        ...l,
        user: users.find(u => u.id === l.userId)
      }))
    }
  };

  return db;
}

async function loginAs(app, db, user) {
  const session = await createSession({ db, userId: user.id, ttlMs: config.sessionTtlMs });
  return `pace_session=${session.token}`;
}

describe('PACE Backend Comprehensive Endpoint Tests', () => {
  let db;
  let app;
  let studentUser, counselorUser, recruiterUser, mentorUser, adminUser;
  let studentCookie, counselorCookie, recruiterCookie, mentorCookie, adminCookie;
  let company;

  beforeEach(async () => {
    db = createMockDb();
    app = createApp({ db, config });

    // Seed roles and users
    const pwdHash = await hashPassword('password123');

    // Company
    company = await db.company.create({
      data: { name: 'Acme Technologies', industry: 'Software Engineering', location: 'Iligan City' }
    });

    // Student
    studentUser = await db.user.create({ data: { email: 'student@example.com', passwordHash: pwdHash, role: 'student' } });
    await db.studentProfile.create({
      data: {
        userId: studentUser.id,
        studentNumber: '2023-0001',
        firstName: 'Juan',
        lastName: 'dela Cruz',
        course: 'BSCS',
        yearLevel: 4,
        phone: '09123456789',
        address: 'MSU-IIT Campus'
      }
    });

    // Counselor
    counselorUser = await db.user.create({ data: { email: 'counselor@example.com', passwordHash: pwdHash, role: 'counselor' } });
    await db.counselorProfile.create({
      data: {
        userId: counselorUser.id,
        employeeId: 'EMP-001',
        department: 'College of Computer Studies',
        phone: '09123456780'
      }
    });

    // Recruiter
    recruiterUser = await db.user.create({ data: { email: 'recruiter@example.com', passwordHash: pwdHash, role: 'recruiter' } });
    await db.recruiterProfile.create({
      data: {
        userId: recruiterUser.id,
        companyId: company.id,
        firstName: 'Jane',
        lastName: 'Recruiter',
        jobTitle: 'Talent Acquisition Lead',
        phone: '09123456781',
        approvalStatus: 'approved'
      }
    });

    // Mentor
    mentorUser = await db.user.create({ data: { email: 'mentor@example.com', passwordHash: pwdHash, role: 'mentor' } });
    await db.mentorProfile.create({
      data: {
        userId: mentorUser.id,
        firstName: 'Alan',
        lastName: 'Turing',
        professionalTitle: 'Principal Engineer',
        companyName: 'Acme Technologies',
        industry: 'Software',
        biography: 'Expert in systems and algorithms',
        expertise: 'Algorithms, Architecture',
        phone: '09123456782',
        approvalStatus: 'approved'
      }
    });

    // Admin
    adminUser = await db.user.create({ data: { email: 'admin@example.com', passwordHash: pwdHash, role: 'admin' } });

    // Login sessions
    studentCookie = await loginAs(app, db, studentUser);
    counselorCookie = await loginAs(app, db, counselorUser);
    recruiterCookie = await loginAs(app, db, recruiterUser);
    mentorCookie = await loginAs(app, db, mentorUser);
    adminCookie = await loginAs(app, db, adminUser);
  });

  describe('Job and Application Endpoints', () => {
    it('allows recruiter to post job, student to save and apply, and recruiter to update status', async () => {
      // 1. Recruiter creates a job
      const postRes = await request(app)
        .post('/api/jobs')
        .set('Cookie', recruiterCookie)
        .send({
          title: 'Full Stack Engineer',
          description: 'Join our awesome engineering team building scalable apps.',
          requirements: 'Node.js, React, PostgreSQL',
          employmentType: 'Full-time',
          location: 'Remote'
        });
      expect(postRes.status).toBe(201);
      const jobId = postRes.body.job.id;
      expect(postRes.body.job.title).toBe('Full Stack Engineer');

      // 2. Public / student lists jobs
      const listRes = await request(app).get('/api/jobs');
      expect(listRes.status).toBe(200);
      expect(listRes.body.jobs.length).toBeGreaterThan(0);

      // 3. Student saves the job
      const saveRes = await request(app)
        .post(`/api/jobs/${jobId}/save`)
        .set('Cookie', studentCookie);
      expect(saveRes.status).toBe(200);

      // Verify in saved jobs
      const savedListRes = await request(app)
        .get('/api/jobs/saved')
        .set('Cookie', studentCookie);
      expect(savedListRes.status).toBe(200);
      expect(savedListRes.body.jobs).toHaveLength(1);

      // 4. Student applies to the job
      const applyRes = await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Cookie', studentCookie)
        .send({ coverLetter: 'I am excited about this role!' });
      expect(applyRes.status).toBe(201);
      const applicationId = applyRes.body.application.id;

      // 5. Recruiter views applicants for the job
      const applicantsRes = await request(app)
        .get(`/api/jobs/${jobId}/applications`)
        .set('Cookie', recruiterCookie);
      expect(applicantsRes.status).toBe(200);
      expect(applicantsRes.body.applications).toHaveLength(1);

      // 6. Recruiter updates application status to "shortlisted"
      const updateStatusRes = await request(app)
        .patch(`/api/jobs/applications/${applicationId}/status`)
        .set('Cookie', recruiterCookie)
        .send({ status: 'shortlisted' });
      expect(updateStatusRes.status).toBe(200);
      expect(updateStatusRes.body.application.status).toBe('shortlisted');
    });
  });

  describe('Resume and Verification Endpoints', () => {
    it('allows student to upload resume, counselor to review and verify, and public verification', async () => {
      // 1. Student uploads resume
      const uploadRes = await request(app)
        .post('/api/resumes')
        .set('Cookie', studentCookie)
        .send({ fileUrl: 'https://storage.msuiit.edu.ph/resumes/juan.pdf', version: '1.0' });
      expect(uploadRes.status).toBe(201);
      const resumeId = uploadRes.body.resume.id;

      // 2. Counselor reviews and verifies the resume
      const reviewRes = await request(app)
        .post(`/api/resumes/${resumeId}/review`)
        .set('Cookie', counselorCookie)
        .send({
          rating: 5,
          feedback: 'Outstanding layout and project portfolio.',
          status: 'approved',
          verify: true
        });
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.resume.isCounselorVerified).toBe(true);
      const verificationCode = reviewRes.body.resume.verificationCode;
      expect(verificationCode).toBeDefined();

      // 3. Public verification endpoint checks verified resume
      const publicVerifyRes = await request(app)
        .get(`/api/resumes/verify/${verificationCode}`);
      expect(publicVerifyRes.status).toBe(200);
      expect(publicVerifyRes.body.verified).toBe(true);
      expect(publicVerifyRes.body.student.firstName).toBe('Juan');
    });
  });

  describe('Appointment and Availability Endpoints', () => {
    it('allows counselor to configure availability, student to book, and counselor to update status', async () => {
      // 1. Counselor sets availability
      const setAvailRes = await request(app)
        .put('/api/appointments/availability')
        .set('Cookie', counselorCookie)
        .send({
          slots: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isWalkIn: false },
            { dayOfWeek: 3, startTime: '13:00', endTime: '17:00', isWalkIn: true }
          ]
        });
      expect(setAvailRes.status).toBe(200);
      expect(setAvailRes.body.slots).toHaveLength(2);

      // 2. Counselor availability is listed
      const counselorProfile = db.counselorProfiles[0];
      const getAvailRes = await request(app)
        .get(`/api/appointments/counselors/${counselorProfile.id}/availability`);
      expect(getAvailRes.status).toBe(200);
      expect(getAvailRes.body.slots).toHaveLength(2);

      // 3. Student books appointment with counselor
      const bookRes = await request(app)
        .post('/api/appointments')
        .set('Cookie', studentCookie)
        .send({
          counselorId: counselorProfile.id,
          appointmentType: 'Career Counseling',
          appointmentDate: '2026-11-20',
          startTime: '09:00',
          endTime: '09:30',
          notes: 'Discuss internship prospects.'
        });
      expect(bookRes.status).toBe(201);
      const appointmentId = bookRes.body.appointment.id;

      // 4. Counselor views appointments and marks completed
      const updateAptRes = await request(app)
        .patch(`/api/appointments/${appointmentId}`)
        .set('Cookie', counselorCookie)
        .send({ status: 'completed', notes: 'Completed career session successfully.' });
      expect(updateAptRes.status).toBe(200);
      expect(updateAptRes.body.appointment.status).toBe('completed');
    });
  });

  describe('Mentorship Endpoints', () => {
    it('allows student to request mentorship and mentor to accept', async () => {
      const mentorProfile = db.mentorProfiles[0];

      // 1. Directory of approved mentors
      const mentorsRes = await request(app).get('/api/mentorships/mentors');
      expect(mentorsRes.status).toBe(200);
      expect(mentorsRes.body.mentors.length).toBeGreaterThan(0);

      // 2. Student requests mentorship
      const reqRes = await request(app)
        .post('/api/mentorships/requests')
        .set('Cookie', studentCookie)
        .send({
          mentorId: mentorProfile.id,
          message: 'I would love guidance on distributed systems.'
        });
      expect(reqRes.status).toBe(201);
      const requestId = reqRes.body.request.id;

      // 3. Mentor responds to request and accepts
      const respondRes = await request(app)
        .patch(`/api/mentorships/requests/${requestId}`)
        .set('Cookie', mentorCookie)
        .send({
          status: 'accepted',
          responseMessage: 'Glad to mentor you!',
          goals: 'Master microservices and distributed databases'
        });
      expect(respondRes.status).toBe(200);
      expect(respondRes.body.mentorship).toBeDefined();
      expect(respondRes.body.mentorship.status).toBe('active');
    });
  });

  describe('Messaging and Conversations Endpoints', () => {
    it('allows users to message each other and mark conversation read', async () => {
      // 1. Student initiates conversation with recruiter
      const convRes = await request(app)
        .post('/api/messages')
        .set('Cookie', studentCookie)
        .send({ recipientId: recruiterUser.id });
      expect(convRes.status).toBe(200);
      const convId = convRes.body.conversation.id;

      // 2. Send message
      const msgRes = await request(app)
        .post(`/api/messages/${convId}/messages`)
        .set('Cookie', studentCookie)
        .send({ content: 'Hello! I am interested in the engineering vacancy.' });
      expect(msgRes.status).toBe(201);
      expect(msgRes.body.message.content).toBe('Hello! I am interested in the engineering vacancy.');

      // 3. Recruiter views conversations and marks as read
      const listConvRes = await request(app)
        .get('/api/messages')
        .set('Cookie', recruiterCookie);
      expect(listConvRes.status).toBe(200);
      expect(listConvRes.body.conversations).toHaveLength(1);

      const markReadRes = await request(app)
        .patch(`/api/messages/${convId}/read`)
        .set('Cookie', recruiterCookie);
      expect(markReadRes.status).toBe(200);
    });
  });

  describe('Admin and Platform Operations', () => {
    it('provides analytics, user management, and talent discovery', async () => {
      // 1. Admin Analytics
      const analyticsRes = await request(app)
        .get('/api/admin/analytics')
        .set('Cookie', adminCookie);
      expect(analyticsRes.status).toBe(200);
      expect(analyticsRes.body.metrics.totalStudents).toBe(1);

      // 2. Admin Users list
      const usersRes = await request(app)
        .get('/api/admin/users')
        .set('Cookie', adminCookie);
      expect(usersRes.status).toBe(200);
      expect(usersRes.body.users.length).toBeGreaterThanOrEqual(5);

      // 3. Talent Discovery for Recruiters
      const talentRes = await request(app)
        .get('/api/students')
        .set('Cookie', recruiterCookie);
      expect(talentRes.status).toBe(200);
      expect(talentRes.body.students).toHaveLength(1);
      expect(talentRes.body.students[0].firstName).toBe('Juan');
    });
  });
});
