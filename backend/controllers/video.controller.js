import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import Video from "../models/Video.js";

// Upload video (teacher only)
export const uploadVideo = async (req, res) => {
  try {
    // Ensure only teacher can upload
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ success: false, message: "Only teachers can upload videos" });
    }

    const { classId, title, topic, description, visibility, url, thumbnail } = req.body;

    if (!title || (!req.file && !url)) {
      return res.status(400).json({
        success: false,
        message: "Title and video file or URL required",
      });
    }

    let videoUrl = "";
    let cloudinaryId = "";

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "live_videos",
      });
      videoUrl = result.secure_url;
      cloudinaryId = result.public_id;

      // Remove local file
      fs.unlinkSync(req.file.path);
    } else if (url) {
      videoUrl = url;
    }

    const newVideo = await Video.create({
      classId,
      title,
      topic,
      description,
      visibility,
      videoUrl,
      thumbnail,
      cloudinaryId,
      uploadedBy: req.user._id,
    });

    res.json({ success: true, data: newVideo });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};

// Fetch videos by class
export const getVideosByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const videos = await Video.find({ classId: classId.trim() }).sort({ createdAt: -1 });
    res.json({ success: true, data: videos });
  } catch (error) {
    console.error("Fetch videos error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch videos" });
  }
};

// Delete video
export const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // Optional: Extra security check if needed
    // if (video.uploadedBy.toString() !== req.user._id.toString()) { ... }

    // Delete from Cloudinary if uploaded
    if (video.cloudinaryId) {
      await cloudinary.uploader.destroy(video.cloudinaryId, {
        resource_type: "video",
      });
    }

    await video.deleteOne();
    res.json({ success: true, message: "Video deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete video" });
  }
};
