import Feedback from "../models/Feedback.js";

export const createFeedback = async (req, res) => {
  try {
    const { classId, questions, enableComment } = req.body;

    if (!questions || questions.length === 0) {
      return res.status(400).json({
        message: "At least one question required",
      });
    }

    // 🔥 STEP 1: deactivate previous feedbacks for this class
    await Feedback.updateMany(
      { classId, isActive: true },
      { $set: { isActive: false } }
    );

    // 🔥 STEP 2: create new active feedback
    const feedback = new Feedback({
      classId,
      createdBy: req.user._id,
      questions,
      enableComment,
      isActive: true,
    });

    await feedback.save();

    res.status(201).json({
      message: "Feedback created successfully",
      feedbackId: feedback._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getActiveFeedback = async (req, res) => {
  try {
    const { classId } = req.params;

    // Find active feedback for this class
    const feedback = await Feedback.findOne({
      classId,
      isActive: true,
    });

    //  No feedback exists
    if (!feedback) {
      return res.json({
        isActive: false,
        reason: "NO_FEEDBACK",
      });
    }

    //  Check if student already submitted
    const alreadySubmitted =
      req.user &&
      feedback.responses?.some(
        (r) => r.studentId.toString() === req.user._id.toString()
      );

    // Student already submitted → treat as inactive
    if (alreadySubmitted) {
      return res.json({
        isActive: false,
        reason: "ALREADY_SUBMITTED",
      });
    }

    // Feedback is active & student has NOT submitted
    return res.json({
      isActive: true,
      feedbackId: feedback._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getFeedbackForm = async (req, res) => {
  try {
    const { classId } = req.params;

    const feedback = await Feedback.findOne({
      classId,
      isActive: true,
    }).select("questions enableComment");

    if (!feedback) {
      return res.status(404).json({ message: "No active feedback" });
    }

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const submitFeedback = async (req, res) => {
  try {
    const { feedbackId, studentName, studentEmail, answers, comment } =
      req.body;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
      ``;
    }

    // DUPLICATE CHECK (IMPORTANT)
    const alreadySubmitted = feedback.responses.find(
      (r) => r.studentId && r.studentId.toString() === req.user._id.toString()
    );

    if (alreadySubmitted) {
      return res.status(400).json({
        message: "Feedback already submitted",
      });
    }

    feedback.responses.push({
      studentId: req.user._id,
      studentName,
      studentEmail,
      answers,
      comment,
    });

    await feedback.save();

    res.json({ message: "Feedback submitted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getFeedbackResults = async (req, res) => {
  try {
    const { classId } = req.params;

    const feedback = await Feedback.findOne({
      classId,
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!feedback) {
      return res.status(404).json({ message: "No active feedback found" });
    }

    res.json(feedback.responses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllFeedbackResults = async (req, res) => {
  try {
    const { classId } = req.params;

    // Find ALL feedbacks for this class
    const feedbacks = await Feedback.find({ classId })
      .sort({ createdAt: -1 }) // latest first
      .select("responses createdAt isActive");

    if (!feedbacks || feedbacks.length === 0) {
      return res.status(404).json({
        message: "No feedback history found",
      });
    }

    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
