import Doubt from "../models/Doubt.js";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import {
  createHttpError,
  getAuthorizedClassroomForStudent,
  getAuthorizedClassroomForTeacher,
  getAuthorizedClassroomForUser,
  getRequestUserId,
} from "../utils/accessControl.js";

const hydrateDoubts = async (doubts) =>
  Promise.all(
    doubts.map(async (doubt) => {
      const doubtObj = doubt.toObject();

      if (doubtObj.authorId) {
        const author = await User.findById(doubtObj.authorId).select(
          "name profilePhoto role"
        );
        if (author) {
          doubtObj.authorName = author.name;
          doubtObj.profilePhoto = author.profilePhoto;
          doubtObj.authorRole = author.role;
        }
      }

      if (Array.isArray(doubtObj.replies) && doubtObj.replies.length > 0) {
        doubtObj.replies = await Promise.all(
          doubtObj.replies.map(async (reply) => {
            if (!reply.authorId) return reply;

            const replyAuthor = await User.findById(reply.authorId).select(
              "name profilePhoto role"
            );
            if (replyAuthor) {
              reply.authorName = replyAuthor.name;
              reply.profilePhoto = replyAuthor.profilePhoto;
              reply.authorRole = replyAuthor.role;
            }
            return reply;
          })
        );
      }

      return doubtObj;
    })
  );

const getAccessibleClassIds = async (req) => {
  const userId = getRequestUserId(req);

  if (req.user.role === "teacher") {
    const classrooms = await Classroom.find({ teacherId: userId }).select("_id");
    return classrooms.map((classroom) => classroom._id.toString());
  }

  if (req.user.role === "student") {
    const classrooms = await Classroom.find({ students: userId }).select("_id");
    return classrooms.map((classroom) => classroom._id.toString());
  }

  throw createHttpError(403, "You are not allowed to access doubts.");
};

const getDoubtWithAccess = async (req, doubtId) => {
  const doubt = await Doubt.findById(doubtId);

  if (!doubt) {
    throw createHttpError(404, "Doubt not found");
  }

  await getAuthorizedClassroomForUser(req, doubt.classId);
  return doubt;
};

const assertReplyPermission = async (req, doubt, reply) => {
  const userId = getRequestUserId(req);

  if (reply.authorId === userId) {
    return;
  }

  if (req.user.role === "teacher") {
    await getAuthorizedClassroomForTeacher(req, doubt.classId);
    return;
  }

  throw createHttpError(403, "You are not allowed to modify this reply.");
};

/* ---------------------------------------------
  GET ALL DOUBTS (Teacher/Student)
--------------------------------------------- */
export const getAllDoubts = async (req, res) => {
  try {
    let classIds;

    if (req.query.classId) {
      const classroom =
        req.user.role === "teacher"
          ? await getAuthorizedClassroomForTeacher(req, req.query.classId)
          : await getAuthorizedClassroomForStudent(req, req.query.classId);

      classIds = [classroom._id.toString()];
    } else {
      classIds = await getAccessibleClassIds(req);
    }

    if (classIds.length === 0) {
      return res.json([]);
    }

    const doubts = await Doubt.find({ classId: { $in: classIds } }).sort({
      createdAt: -1,
    });

    res.json(await hydrateDoubts(doubts));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to fetch doubts" });
  }
};

/* ---------------------------------------------
  GET DOUBTS BY CLASS ID
--------------------------------------------- */
export const getDoubtsByClass = async (req, res) => {
  try {
    const classroom = await getAuthorizedClassroomForUser(req, req.params.classId);

    const doubts = await Doubt.find({ classId: classroom._id.toString() }).sort({
      createdAt: -1,
    });

    res.json(await hydrateDoubts(doubts));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to get doubts" });
  }
};

/* ---------------------------------------------
  POST A DOUBT (Student Only)
--------------------------------------------- */
export const postDoubt = async (req, res) => {
  try {
    const title = req.body.title?.trim();
    const description = req.body.description?.trim();

    if (!title || !description || !req.body.classId) {
      throw createHttpError(400, "classId, title, and description are required");
    }

    const classroom = await getAuthorizedClassroomForStudent(req, req.body.classId);

    const doubt = await Doubt.create({
      classId: classroom._id.toString(),
      authorId: getRequestUserId(req),
      authorName: req.user.name,
      authorRole: req.user.role,
      profilePhoto: req.user.profilePhoto || "",
      title,
      description,
    });

    const [hydratedDoubt] = await hydrateDoubts([doubt]);
    res.json(hydratedDoubt);
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to post doubt" });
  }
};

/* ---------------------------------------------
  EDIT DOUBT (Author Only)
--------------------------------------------- */
export const editDoubt = async (req, res) => {
  try {
    const doubt = await getDoubtWithAccess(req, req.params.id);
    const userId = getRequestUserId(req);

    if (doubt.authorId !== userId) {
      throw createHttpError(403, "You can only edit your own doubt.");
    }

    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : doubt.title;
    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : doubt.description;

    if (!title || !description) {
      throw createHttpError(400, "title and description cannot be empty");
    }

    doubt.title = title;
    doubt.description = description;
    await doubt.save();

    const [hydratedDoubt] = await hydrateDoubts([doubt]);
    res.json(hydratedDoubt);
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to edit doubt" });
  }
};

/* ---------------------------------------------
  DELETE DOUBT (Author or Classroom Teacher)
--------------------------------------------- */
export const deleteDoubt = async (req, res) => {
  try {
    const doubt = await getDoubtWithAccess(req, req.params.id);
    const userId = getRequestUserId(req);

    if (doubt.authorId !== userId && req.user.role !== "teacher") {
      throw createHttpError(403, "You are not allowed to delete this doubt.");
    }

    await Doubt.findByIdAndDelete(req.params.id);
    res.json({ message: "Doubt deleted successfully" });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to delete doubt" });
  }
};

/* ---------------------------------------------
  ADD REPLY
--------------------------------------------- */
export const addReply = async (req, res) => {
  try {
    const doubt = await getDoubtWithAccess(req, req.params.id);
    const message = req.body.message?.trim();

    if (!message) {
      throw createHttpError(400, "message is required");
    }

    const reply = {
      authorId: getRequestUserId(req),
      authorName: req.user.name,
      authorRole: req.user.role,
      profilePhoto: req.user.profilePhoto || "",
      message,
      createdAt: Date.now(),
    };

    doubt.replies.push(reply);
    await doubt.save();

    res.json(reply);
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to add reply" });
  }
};

/* ---------------------------------------------
  DELETE A REPLY
--------------------------------------------- */
export const deleteReply = async (req, res) => {
  try {
    const index = Number(req.body.index);
    const doubt = await getDoubtWithAccess(req, req.params.id);

    if (!Number.isInteger(index) || index < 0 || index >= doubt.replies.length) {
      throw createHttpError(404, "Reply not found");
    }

    await assertReplyPermission(req, doubt, doubt.replies[index]);

    doubt.replies.splice(index, 1);
    await doubt.save();

    res.json({ message: "Reply deleted" });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to delete reply" });
  }
};

/* ---------------------------------------------
  EDIT A REPLY
--------------------------------------------- */
export const editReply = async (req, res) => {
  try {
    const index = Number(req.body.index);
    const message = req.body.message?.trim();
    const doubt = await getDoubtWithAccess(req, req.params.id);

    if (!Number.isInteger(index) || index < 0 || index >= doubt.replies.length) {
      throw createHttpError(404, "Reply not found");
    }

    if (!message) {
      throw createHttpError(400, "message is required");
    }

    await assertReplyPermission(req, doubt, doubt.replies[index]);

    doubt.replies[index].message = message;
    await doubt.save();

    res.json(doubt.replies[index]);
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to edit reply" });
  }
};
