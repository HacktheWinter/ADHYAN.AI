import ActivityLog from "../models/ActivityLog.js";
import ClassSession from "../models/ClassSession.js";

const calculateDurationMinutes = (startedAt, endedAt) => {
  const startTime = new Date(startedAt).getTime();
  const endTime = new Date(endedAt).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
    return 0;
  }

  return Math.max(1, Math.round((endTime - startTime) / 60000));
};

export const logActivity = async ({
  actorId = null,
  actorRole = "teacher",
  classroomId = null,
  action,
  entityType,
  entityId = null,
  meta = {},
}) => {
  if (!action || !entityType) return null;

  try {
    return await ActivityLog.create({
      actorId,
      actorRole,
      classroomId,
      action,
      entityType,
      entityId,
      meta,
    });
  } catch (error) {
    console.error("[ActivityLog] Failed to create log:", error.message);
    return null;
  }
};

export const startClassSession = async ({
  classroomId,
  teacherId,
  source = "live",
  meta = {},
}) => {
  if (!classroomId || !teacherId) return null;

  try {
    const existingSession = await ClassSession.findOne({
      classroomId,
      teacherId,
      source,
      status: "active",
    }).sort({ startedAt: -1 });

    if (existingSession) {
      return existingSession;
    }

    return await ClassSession.create({
      classroomId,
      teacherId,
      source,
      meta,
    });
  } catch (error) {
    console.error("[ClassSession] Failed to start session:", error.message);
    return null;
  }
};

export const endClassSession = async ({
  classroomId,
  teacherId = null,
  source = "live",
  meta = {},
}) => {
  if (!classroomId) return null;

  try {
    const sessionQuery = {
      classroomId,
      source,
      status: "active",
    };

    if (teacherId) {
      sessionQuery.teacherId = teacherId;
    }

    const activeSession = await ClassSession.findOne(sessionQuery).sort({
      startedAt: -1,
    });

    if (!activeSession) {
      return null;
    }

    const endedAt = new Date();

    activeSession.endedAt = endedAt;
    activeSession.durationMinutes = calculateDurationMinutes(
      activeSession.startedAt,
      endedAt
    );
    activeSession.status = "ended";
    activeSession.meta = {
      ...(activeSession.meta || {}),
      ...(meta || {}),
    };

    await activeSession.save();
    return activeSession;
  } catch (error) {
    console.error("[ClassSession] Failed to end session:", error.message);
    return null;
  }
};
