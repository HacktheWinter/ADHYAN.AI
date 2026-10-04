import CodingAssessment from "../models/CodingAssessment.js";
import CodingSubmission from "../models/CodingSubmission.js";
import ActivityLog from "../models/ActivityLog.js";
import Classroom from "../models/Classroom.js";
import cloudinary from "../config/cloudinary.js";

// ==================== TEACHER CONTROLLERS ====================

// Upload reference image
export const uploadReferenceImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "coding_references" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          return res.status(500).json({ error: "Error uploading image to Cloudinary." });
        }
        res.status(200).json({ success: true, url: result.secure_url });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error("Error in uploadReferenceImage:", error);
    res.status(500).json({ error: "Failed to upload reference image." });
  }
};

// Create a coding assessment
export const createCodingAssessment = async (req, res) => {
  try {
    const {
      classroomId,
      title,
      problemStatement,
      requirements,
      maxMarks,
      duration,
      referenceImageUrl,
      starterHtml,
      starterCss,
      starterJs,
    } = req.body;

    if (!classroomId || !title || !problemStatement) {
      return res.status(400).json({
        error: "classroomId, title, and problemStatement are required.",
      });
    }

    const assessment = await CodingAssessment.create({
      classroomId,
      teacherId: req.user._id,
      title,
      problemStatement,
      requirements: requirements || "",
      maxMarks: Number.isFinite(Number(maxMarks)) && Number(maxMarks) > 0 ? Number(maxMarks) : 10,
      duration: duration || 60,
      referenceImageUrl: referenceImageUrl || null,
      starterHtml:
        starterHtml ||
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Project</title>\n</head>\n<body>\n  \n</body>\n</html>',
      starterCss: starterCss || "/* Write your CSS here */\n",
      starterJs: starterJs || "// Write your JavaScript here\n",
    });

    // Log activity
    await ActivityLog.create({
      actorId: req.user._id,
      actorRole: "teacher",
      classroomId,
      action: "created",
      entityType: "CodingAssessment",
      entityId: assessment._id,
      meta: { title },
    });

    res.status(201).json({ success: true, assessment });
  } catch (error) {
    console.error("Error creating coding assessment:", error);
    res.status(500).json({ error: "Failed to create coding assessment." });
  }
};

// Get all coding assessments for a classroom
export const getCodingAssessmentsByClassroom = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const assessments = await CodingAssessment.find({ classroomId }).sort({
      createdAt: -1,
    });
    res.json({ success: true, assessments });
  } catch (error) {
    console.error("Error fetching coding assessments:", error);
    res.status(500).json({ error: "Failed to fetch coding assessments." });
  }
};

// Get a single coding assessment by ID
export const getCodingAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const assessment = await CodingAssessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ error: "Coding assessment not found." });
    }
    res.json({ success: true, assessment });
  } catch (error) {
    console.error("Error fetching coding assessment:", error);
    res.status(500).json({ error: "Failed to fetch coding assessment." });
  }
};

// Update a coding assessment
export const updateCodingAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const updates = req.body;

    const assessment = await CodingAssessment.findByIdAndUpdate(
      assessmentId,
      updates,
      { new: true }
    );

    if (!assessment) {
      return res.status(404).json({ error: "Coding assessment not found." });
    }

    res.json({ success: true, assessment });
  } catch (error) {
    console.error("Error updating coding assessment:", error);
    res.status(500).json({ error: "Failed to update coding assessment." });
  }
};

// Delete a coding assessment
export const deleteCodingAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const assessment = await CodingAssessment.findByIdAndDelete(assessmentId);
    if (!assessment) {
      return res.status(404).json({ error: "Coding assessment not found." });
    }

    // Also delete all associated submissions
    await CodingSubmission.deleteMany({ assessmentId });

    await ActivityLog.create({
      actorId: req.user._id,
      actorRole: "teacher",
      classroomId: assessment.classroomId,
      action: "deleted",
      entityType: "CodingAssessment",
      entityId: assessmentId,
      meta: { title: assessment.title },
    });

    res.json({ success: true, message: "Coding assessment deleted." });
  } catch (error) {
    console.error("Error deleting coding assessment:", error);
    res.status(500).json({ error: "Failed to delete coding assessment." });
  }
};

// Publish / unpublish a coding assessment with timing
export const publishCodingAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { status, startTime, endTime } = req.body;

    const updateData = { status: status || "published" };

    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (status === "published") updateData.isActive = true;
    if (status === "draft") {
      updateData.isActive = false;
      updateData.startTime = null;
      updateData.endTime = null;
    }

    const assessment = await CodingAssessment.findByIdAndUpdate(
      assessmentId,
      updateData,
      { new: true }
    );

    if (!assessment) {
      return res.status(404).json({ error: "Coding assessment not found." });
    }

    await ActivityLog.create({
      actorId: req.user._id,
      actorRole: "teacher",
      classroomId: assessment.classroomId,
      action: status === "published" ? "published" : "unpublished",
      entityType: "CodingAssessment",
      entityId: assessmentId,
      meta: { title: assessment.title },
    });

    res.json({ success: true, assessment });
  } catch (error) {
    console.error("Error publishing coding assessment:", error);
    res.status(500).json({ error: "Failed to publish coding assessment." });
  }
};

// Get all submissions for a coding assessment (teacher view)
export const getCodingSubmissions = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const submissions = await CodingSubmission.find({ assessmentId })
      .populate("studentId", "name email profilePhoto")
      .sort({ submissionTime: -1 });

    res.json({ success: true, submissions });
  } catch (error) {
    console.error("Error fetching coding submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions." });
  }
};

// Grade a student's coding submission.
export const gradeCodingSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { marksAwarded, teacherFeedback = "" } = req.body;
    const submission = await CodingSubmission.findById(submissionId);
    if (!submission) return res.status(404).json({ error: "Submission not found." });
    if (submission.submissionStatus === "in-progress") {
      return res.status(400).json({ error: "You can grade a submission after the student submits it." });
    }
    const assessment = await CodingAssessment.findById(submission.assessmentId);
    if (!assessment) return res.status(404).json({ error: "Coding assessment not found." });
    if (assessment.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You cannot grade submissions for this assessment." });
    }
    const marks = Number(marksAwarded);
    if (!Number.isFinite(marks) || marks < 0 || marks > assessment.maxMarks) {
      return res.status(400).json({ error: `Marks must be between 0 and ${assessment.maxMarks}.` });
    }
    submission.marksAwarded = marks;
    submission.teacherFeedback = String(teacherFeedback).slice(0, 2000);
    submission.gradedAt = new Date();
    await submission.save();
    res.json({ success: true, submission });
  } catch (error) {
    console.error("Error grading coding submission:", error);
    res.status(500).json({ error: "Failed to save grade." });
  }
};

// Get a single submission detail (teacher view)
export const getCodingSubmissionDetail = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await CodingSubmission.findById(submissionId)
      .populate("studentId", "name email profilePhoto")
      .populate("assessmentId", "title problemStatement requirements duration");

    if (!submission) {
      return res.status(404).json({ error: "Submission not found." });
    }

    res.json({ success: true, submission });
  } catch (error) {
    console.error("Error fetching submission detail:", error);
    res.status(500).json({ error: "Failed to fetch submission." });
  }
};

// ==================== STUDENT CONTROLLERS ====================

// Get active (published) coding assessments for a classroom
export const getActiveCodingAssessments = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const now = new Date();

    const assessments = await CodingAssessment.find({
      classroomId,
      status: "published",
      isActive: true,
    }).sort({ createdAt: -1 });

    // Filter by time window if applicable
    const filtered = assessments.filter((a) => {
      if (a.startTime && now < a.startTime) return false;
      if (a.endTime && now > a.endTime) return false;
      return true;
    });

    // Check which assessments the student already submitted
    const studentId = req.user._id;
    const submittedAssessmentIds = (
      await CodingSubmission.find({
        studentId,
        assessmentId: { $in: filtered.map((a) => a._id) },
        submissionStatus: { $in: ["submitted", "auto-submitted"] },
      }).select("assessmentId")
    ).map((s) => s.assessmentId.toString());

    const result = filtered.map((a) => ({
      ...a.toObject(),
      alreadySubmitted: submittedAssessmentIds.includes(a._id.toString()),
    }));

    res.json({ success: true, assessments: result });
  } catch (error) {
    console.error("Error fetching active coding assessments:", error);
    res.status(500).json({ error: "Failed to fetch coding assessments." });
  }
};

// Start a coding round (create in-progress submission)
export const startCodingRound = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const studentId = req.user._id;
    const studentName = req.user.name;

    const assessment = await CodingAssessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ error: "Coding assessment not found." });
    }

    // Check for existing submission
    const existing = await CodingSubmission.findOne({
      assessmentId,
      studentId,
    });

    if (existing) {
      // Return existing submission (resume)
      return res.json({
        success: true,
        submission: existing,
        assessment,
        resumed: true,
      });
    }

    // Create new in-progress submission
    const submission = await CodingSubmission.create({
      assessmentId,
      studentId,
      studentName,
      classroomId: assessment.classroomId,
      htmlCode: assessment.starterHtml,
      cssCode: assessment.starterCss,
      jsCode: assessment.starterJs,
      startTime: new Date(),
      submissionStatus: "in-progress",
    });

    await ActivityLog.create({
      actorId: studentId,
      actorRole: "student",
      classroomId: assessment.classroomId,
      action: "started",
      entityType: "CodingRound",
      entityId: assessmentId,
      meta: { title: assessment.title },
    });

    res.status(201).json({
      success: true,
      submission,
      assessment,
      resumed: false,
    });
  } catch (error) {
    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      const existing = await CodingSubmission.findOne({
        assessmentId: req.params.assessmentId,
        studentId: req.user._id,
      });
      const assessment = await CodingAssessment.findById(
        req.params.assessmentId
      );
      return res.json({
        success: true,
        submission: existing,
        assessment,
        resumed: true,
      });
    }
    console.error("Error starting coding round:", error);
    res.status(500).json({ error: "Failed to start coding round." });
  }
};

// Save progress (auto-save while coding)
export const saveCodingProgress = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { htmlCode, cssCode, jsCode } = req.body;

    const submission = await CodingSubmission.findOneAndUpdate(
      {
        _id: submissionId,
        studentId: req.user._id,
        submissionStatus: "in-progress",
      },
      { htmlCode, cssCode, jsCode },
      { new: true }
    );

    if (!submission) {
      return res
        .status(404)
        .json({ error: "Submission not found or already submitted." });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving progress:", error);
    res.status(500).json({ error: "Failed to save progress." });
  }
};

// Submit the coding round
export const submitCodingRound = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const {
      htmlCode,
      cssCode,
      jsCode,
      autoSubmitted,
      autoSubmitReason,
      violations,
    } = req.body;

    const submission = await CodingSubmission.findOne({
      _id: submissionId,
      studentId: req.user._id,
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found." });
    }

    if (
      submission.submissionStatus === "submitted" ||
      submission.submissionStatus === "auto-submitted"
    ) {
      return res.status(400).json({ error: "Already submitted." });
    }

    const now = new Date();
    const timeTaken = Math.floor((now - submission.startTime) / 1000);

    submission.htmlCode = htmlCode || submission.htmlCode;
    submission.cssCode = cssCode || submission.cssCode;
    submission.jsCode = jsCode || submission.jsCode;
    submission.submissionTime = now;
    submission.timeTaken = timeTaken;
    submission.submissionStatus = autoSubmitted
      ? "auto-submitted"
      : "submitted";
    submission.autoSubmitted = autoSubmitted || false;
    submission.autoSubmitReason = autoSubmitReason || null;

    if (violations && violations.length > 0) {
      submission.violations = violations;
      submission.violationCount = violations.length;
    }

    await submission.save();

    await ActivityLog.create({
      actorId: req.user._id,
      actorRole: "student",
      classroomId: submission.classroomId,
      action: autoSubmitted ? "auto-submitted" : "submitted",
      entityType: "CodingRound",
      entityId: submission.assessmentId,
      meta: {
        timeTaken,
        violationCount: submission.violationCount,
      },
    });

    res.json({ success: true, submission });
  } catch (error) {
    console.error("Error submitting coding round:", error);
    res.status(500).json({ error: "Failed to submit." });
  }
};

// Check if student has already submitted
export const checkCodingSubmission = async (req, res) => {
  try {
    const { assessmentId, studentId } = req.params;
    const submission = await CodingSubmission.findOne({
      assessmentId,
      studentId,
    });

    res.json({
      success: true,
      hasSubmission: !!submission,
      submissionStatus: submission?.submissionStatus || null,
      submission: submission || null,
    });
  } catch (error) {
    console.error("Error checking submission:", error);
    res.status(500).json({ error: "Failed to check submission." });
  }
};
