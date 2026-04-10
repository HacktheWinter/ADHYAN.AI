import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import mongoose from "mongoose";

/**
 * GET /api/audit/logs
 * Admin-only. Retrieve paginated audit logs with filters.
 *
 * Query params:
 *   page (default 1), limit (default 25), 
 *   status (match|no_match|liveness_fail),
 *   dateFrom, dateTo, studentId, classId
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      status,
      dateFrom,
      dateTo,
      studentId,
      classId,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Status filter
    if (status && ["match", "no_match", "liveness_fail"].includes(status)) {
      filter.status = status;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) {
        filter.timestamp.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        filter.timestamp.$lt = end;
      }
    }

    // Student filter
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
      filter.studentId = studentId;
    }

    // Class filter
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      filter.classId = classId;
    }

    // Search by student name
    if (search && search.trim()) {
      const matchingStudents = await User.find({
        name: { $regex: search.trim(), $options: "i" },
      })
        .select("_id")
        .lean();

      if (matchingStudents.length > 0) {
        filter.studentId = {
          $in: matchingStudents.map((s) => s._id),
        };
      } else {
        // No matching students → return empty
        return res.status(200).json({
          success: true,
          logs: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 },
        });
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("studentId", "name email erpId profilePhoto")
        .populate("classId", "name subject classCode")
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    // Aggregate stats for the filtered set
    const stats = await AuditLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalVerifications: { $sum: 1 },
          matches: {
            $sum: { $cond: [{ $eq: ["$status", "match"] }, 1, 0] },
          },
          noMatches: {
            $sum: { $cond: [{ $eq: ["$status", "no_match"] }, 1, 0] },
          },
          livenessFails: {
            $sum: { $cond: [{ $eq: ["$status", "liveness_fail"] }, 1, 0] },
          },
          avgScore: { $avg: "$similarityScore" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      logs,
      stats: stats[0] || {
        totalVerifications: 0,
        matches: 0,
        noMatches: 0,
        livenessFails: 0,
        avgScore: 0,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[AuditController] getAuditLogs error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching audit logs",
    });
  }
};

/**
 * GET /api/audit/logs/:id
 * Admin-only. Retrieve a single audit log by ID.
 */
export const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "A valid audit log ID is required",
      });
    }

    const log = await AuditLog.findById(id)
      .populate("studentId", "name email erpId profilePhoto")
      .populate("classId", "name subject classCode")
      .populate("attendanceId", "date sessionLabel status");

    if (!log) {
      return res.status(404).json({
        success: false,
        error: "Audit log not found",
      });
    }

    return res.status(200).json({
      success: true,
      log,
    });
  } catch (error) {
    console.error("[AuditController] getAuditLogById error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching audit log",
    });
  }
};

/**
 * GET /api/audit/stats
 * Admin-only. Get aggregated audit statistics.
 */
export const getAuditStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));

    const [stats, dailyBreakdown] = await Promise.all([
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: null,
            totalVerifications: { $sum: 1 },
            matches: {
              $sum: { $cond: [{ $eq: ["$status", "match"] }, 1, 0] },
            },
            noMatches: {
              $sum: { $cond: [{ $eq: ["$status", "no_match"] }, 1, 0] },
            },
            livenessFails: {
              $sum: { $cond: [{ $eq: ["$status", "liveness_fail"] }, 1, 0] },
            },
            avgScore: { $avg: "$similarityScore" },
            uniqueStudents: { $addToSet: "$studentId" },
          },
        },
        {
          $project: {
            _id: 0,
            totalVerifications: 1,
            matches: 1,
            noMatches: 1,
            livenessFails: 1,
            avgScore: { $round: ["$avgScore", 3] },
            uniqueStudents: { $size: "$uniqueStudents" },
          },
        },
      ]),
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
              },
              status: "$status",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      stats: stats[0] || {
        totalVerifications: 0,
        matches: 0,
        noMatches: 0,
        livenessFails: 0,
        avgScore: 0,
        uniqueStudents: 0,
      },
      dailyBreakdown,
    });
  } catch (error) {
    console.error("[AuditController] getAuditStats error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching audit stats",
    });
  }
};
