import {
  getStudentProfile as getStudentProfileRecord,
  updateStudentProfile as updateStudentProfileRecord
} from "../services/student.service.js";
import { listStudentsTalent } from "../services/admin.service.js";
import { updateStudentProfileSchema } from "../schemas/student.schemas.js";

function mapUniqueConstraintError(error) {
  if (error.code !== "23505" && error.code !== "P2002") return error;

  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.join(",")
    : `${error.constraint || ""} ${error.detail || ""}`;
  if (target.toLowerCase().includes("student_number") || target.toLowerCase().includes("studentnumber")) {
    error.status = 409;
    error.code = "STUDENT_NUMBER_ALREADY_REGISTERED";
    error.message = "Student number is already registered";
  }
  return error;
}

export function createStudentController({ db }) {
  async function getProfile(req, res, next) {
    try {
      const profile = await getStudentProfileRecord({ db, userId: req.user.id });
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  }

  async function updateProfile(req, res, next) {
    try {
      const profile = updateStudentProfileSchema.parse(req.body);
      const updatedProfile = await updateStudentProfileRecord({
        db,
        userId: req.user.id,
        profile
      });
      res.json({ profile: updatedProfile });
    } catch (error) {
      next(mapUniqueConstraintError(error));
    }
  }

  async function listStudents(req, res, next) {
    try {
      const result = await listStudentsTalent({
        db,
        search: req.query.search || null,
        course: req.query.course || null,
        yearLevel: req.query.yearLevel ? parseInt(req.query.yearLevel, 10) : null,
        careerStatus: req.query.careerStatus || null,
        page: req.query.page ? parseInt(req.query.page, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  return { getProfile, updateProfile, listStudents };
}
