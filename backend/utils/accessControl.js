import mongoose from "mongoose";
import Classroom from "../models/Classroom.js";

export const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const getRequestUserId = (req) => req.user?._id?.toString() || null;

const toIdString = (value) => value?.toString?.() || String(value);

export const ensureUserMatchesId = (providedId, actualId, message) => {
  if (!providedId || !actualId) return;

  if (toIdString(providedId) !== toIdString(actualId)) {
    throw createHttpError(
      403,
      message || "You are not allowed to act on behalf of another user."
    );
  }
};

export const getClassroomByIdOrCode = async (classroomIdOrCode) => {
  let classroom = null;

  if (classroomIdOrCode && mongoose.Types.ObjectId.isValid(classroomIdOrCode)) {
    classroom = await Classroom.findById(classroomIdOrCode);
  }

  if (!classroom && classroomIdOrCode) {
    classroom = await Classroom.findOne({ classCode: classroomIdOrCode });
  }

  if (!classroom) {
    throw createHttpError(404, "Classroom not found");
  }

  return classroom;
};

export const assertTeacherOwnsClassroom = (classroom, teacherId) => {
  if (classroom.teacherId?.toString() !== toIdString(teacherId)) {
    throw createHttpError(
      403,
      "You are not authorized to access this classroom."
    );
  }

  return classroom;
};

export const assertStudentEnrolledInClassroom = (classroom, studentId) => {
  const isEnrolled = classroom.students?.some(
    (id) => id.toString() === toIdString(studentId)
  );

  if (!isEnrolled) {
    throw createHttpError(
      403,
      "You are not enrolled in this classroom."
    );
  }

  return classroom;
};

export const getAuthorizedClassroomForTeacher = async (req, classroomIdOrCode) => {
  const teacherId = getRequestUserId(req);

  if (!teacherId || req.user?.role !== "teacher") {
    throw createHttpError(403, "Only teachers can access this resource.");
  }

  const classroom = await getClassroomByIdOrCode(classroomIdOrCode);
  return assertTeacherOwnsClassroom(classroom, teacherId);
};

export const getAuthorizedClassroomForStudent = async (req, classroomIdOrCode) => {
  const studentId = getRequestUserId(req);

  if (!studentId || req.user?.role !== "student") {
    throw createHttpError(403, "Only students can access this resource.");
  }

  const classroom = await getClassroomByIdOrCode(classroomIdOrCode);
  return assertStudentEnrolledInClassroom(classroom, studentId);
};

export const getAuthorizedClassroomForUser = async (req, classroomIdOrCode) => {
  if (req.user?.role === "teacher") {
    return getAuthorizedClassroomForTeacher(req, classroomIdOrCode);
  }

  if (req.user?.role === "student") {
    return getAuthorizedClassroomForStudent(req, classroomIdOrCode);
  }

  throw createHttpError(403, "You are not allowed to access this resource.");
};
