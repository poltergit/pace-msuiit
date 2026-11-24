import {
  createAppointmentSchema,
  updateAppointmentSchema,
  setAvailabilitySchema
} from '../schemas/appointment.schemas.js';
import {
  listCounselors as listCounselorsService,
  getCounselorAvailability as getCounselorAvailabilityService,
  setCounselorAvailability as setCounselorAvailabilityService,
  createAppointment as createAppointmentService,
  listAppointments as listAppointmentsService,
  updateAppointment as updateAppointmentService
} from '../services/appointment.service.js';

export function createAppointmentController({ db }) {
  async function listCounselors(req, res, next) {
    try {
      const counselors = await listCounselorsService({ db });
      res.json({ counselors });
    } catch (error) {
      next(error);
    }
  }

  async function getCounselorAvailability(req, res, next) {
    try {
      const slots = await getCounselorAvailabilityService({
        db,
        counselorId: req.params.counselorId
      });
      res.json({ slots });
    } catch (error) {
      next(error);
    }
  }

  async function setMyAvailability(req, res, next) {
    try {
      const parsed = setAvailabilitySchema.parse(req.body);
      const slots = await setCounselorAvailabilityService({
        db,
        counselorUserId: req.user.id,
        slots: parsed.slots
      });
      res.json({ slots });
    } catch (error) {
      next(error);
    }
  }

  async function bookAppointment(req, res, next) {
    try {
      const parsed = createAppointmentSchema.parse(req.body);
      const appointment = await createAppointmentService({
        db,
        userId: req.user.id,
        data: parsed
      });
      res.status(201).json({ appointment });
    } catch (error) {
      next(error);
    }
  }

  async function listAppointments(req, res, next) {
    try {
      const appointments = await listAppointmentsService({
        db,
        userId: req.user.id,
        userRole: req.user.role,
        status: req.query.status || null,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50
      });
      res.json({ appointments });
    } catch (error) {
      next(error);
    }
  }

  async function updateAppointment(req, res, next) {
    try {
      const parsed = updateAppointmentSchema.parse(req.body);
      const appointment = await updateAppointmentService({
        db,
        appointmentId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        data: parsed
      });
      res.json({ appointment });
    } catch (error) {
      next(error);
    }
  }

  return {
    listCounselors,
    getCounselorAvailability,
    setMyAvailability,
    bookAppointment,
    listAppointments,
    updateAppointment
  };
}
