import React, { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import {
  Upload,
  Link2,
  Video,
  Eye,
  Trash2,
  Calendar,
  FileText,
  Play,
  X,
  CheckCircle2,
  AlertCircle,
  CloudUpload,
  Clock,
  Layout,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VideoWatch from "./VideoWatch";
import { getStoredUser } from "../utils/authStorage";

const LiveVideoUpload = ({ classId, role }) => {
  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [visibility, setVisibility] = useState("class");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Video player state
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const effectiveRole = role || currentUser?.role;

  const fileInputRef = useRef(null);

  // ---------------- FETCH VIDEOS ----------------
  const fetchVideos = async () => {
    try {
      const res = await api.get(`/live/videos/${classId}`);
      const data = res.data?.success ? res.data.data : res.data;
      setVideos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  };

  useEffect(() => {
    if (classId) fetchVideos();
  }, [classId]);

  // ---------------- AUTO THUMBNAIL ----------------
  const handleVideoSelect = (file) => {
    if (!file) return;
    setVideoFile(file);
    setVideoUrl("");
    setThumbnail(null);

    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.currentTime = 1.5;

    video.onloadeddata = () => {
      video.currentTime = 1.5;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const ratio = video.videoWidth / video.videoHeight;
      canvas.width = 640;
      canvas.height = 640 / ratio;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumbnail(canvas.toDataURL("image/jpeg", 0.8));
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      console.error("Error loading video for thumbnail");
      URL.revokeObjectURL(video.src);
    };
  };

  // ---------------- UPLOAD VIDEO ----------------
  const uploadVideoHandler = async () => {
    if (!title || (!videoFile && !videoUrl)) {
      alert("Please add title and video");
      return;
    }

    try {
      setLoading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append("classId", classId);
      formData.append("title", title);
      formData.append("topic", topic);
      formData.append("description", description);
      formData.append("visibility", visibility);

      if (videoFile) formData.append("video", videoFile);
      if (videoUrl) formData.append("url", videoUrl);
      if (thumbnail) formData.append("thumbnail", thumbnail);

      const res = await api.post("/live/videos", formData, {
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(percent);
        },
      });

      if (res.data.success) {
        // Reset form
        setTitle("");
        setTopic("");
        setDescription("");
        setVideoFile(null);
        setVideoUrl("");
        setThumbnail(null);
        setProgress(0);
        setShowUploadForm(false);
        fetchVideos();
      } else {
        alert(res.data.error || "Upload failed");
      }
    } catch (err) {
      alert("Upload failed. Please check the console for details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- DELETE VIDEO ----------------
  const deleteVideo = async (id) => {
    if (!window.confirm("Are you sure you want to delete this video lecture?"))
      return;

    try {
      const res = await api.delete(`/live/videos/${id}`);
      if (res.data.success) {
        setVideos((prev) => prev.filter((v) => v._id !== id));
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  // ---------------- PLAY VIDEO ----------------
  const handlePlayVideo = (video) => {
    setSelectedVideo(video);
    setShowVideoPlayer(true);
  };

  const handleClosePlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* ---------------- HEADER SECTION ---------------- */}
      <div className="bg-paper rounded-2xl p-4 sm:p-6 border border-line">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-ink mb-1 flex items-center justify-center sm:justify-start gap-2 font-display">
              <Video className="w-5 h-5 sm:w-6 sm:h-6" />
              Video Lectures
            </h2>
            <p className="text-ink-soft text-sm">
              Upload and manage recorded lectures for your students
            </p>
          </div>

          {effectiveRole === "teacher" && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-violet-700 hover:bg-violet-800 text-white dark:bg-violet-950/40 dark:text-violet-300 border border-transparent dark:border-violet-700/60 dark:hover:border-violet-500 dark:hover:bg-violet-950/80 font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              {showUploadForm ? (
                <>
                  <X className="w-5 h-5" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-5 h-5" />
                  <span>Upload Video</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ---------------- UPLOAD FORM (TEACHER) ---------------- */}
      <AnimatePresence>
        {effectiveRole === "teacher" && showUploadForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-surface rounded-2xl border border-line shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-violet-700 to-violet-800 p-4 sm:p-6 text-white">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 font-display">
                <Video className="w-5 h-5" />
                Upload New Video
              </h3>
              <p className="text-white/80 text-sm mt-1">
                Fill in the details and upload your lecture recording
              </p>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Title and Topic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-line bg-paper text-ink focus:bg-surface focus:ring-2 focus:ring-violet-500 rounded-xl outline-none transition-all"
                    placeholder="e.g. Introduction to React Hooks"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Topic
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-line bg-paper text-ink focus:bg-surface focus:ring-2 focus:ring-violet-500 rounded-xl outline-none transition-all"
                    placeholder="e.g. React Fundamentals"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 border border-line bg-paper text-ink focus:bg-surface focus:ring-2 focus:ring-violet-500 rounded-xl outline-none transition-all resize-none"
                  placeholder="Describe what students will learn in this lecture..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Video Upload or URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Upload Video File
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      videoFile
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-line hover:border-violet-500 hover:bg-paper"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={(e) => handleVideoSelect(e.target.files[0])}
                    />

                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        className="w-full h-32 object-cover rounded-lg mb-2"
                        alt="Thumbnail"
                      />
                    ) : (
                      <CloudUpload
                        className={`w-12 h-12 mx-auto mb-2 ${
                          videoFile ? "text-emerald-600" : "text-ink-soft/60"
                        }`}
                      />
                    )}

                    <p className="text-sm font-semibold text-ink">
                      {videoFile
                        ? videoFile.name.length > 30
                          ? videoFile.name.slice(0, 30) + "..."
                          : videoFile.name
                        : "Click to upload video"}
                    </p>
                    <p className="text-xs text-ink-soft mt-1">
                      MP4, AVI, MOV supported
                    </p>
                  </div>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Or Enter Video URL
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 border border-line bg-paper focus-within:bg-surface focus-within:ring-2 focus-within:ring-violet-500 rounded-xl">
                      <Link2 className="w-5 h-5 text-ink-soft/60" />
                      <input
                        type="url"
                        className="flex-1 bg-transparent text-ink placeholder:text-ink-soft/40 outline-none min-w-0"
                        placeholder="https://youtube.com/watch?v=..."
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          setVideoFile(null);
                          setThumbnail(null);
                        }}
                      />
                    </div>

                    {/* Visibility */}
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">
                        Visibility
                      </label>
                      <div className="flex gap-3">
                        {["class", "public"].map((v) => (
                          <button
                            key={v}
                            onClick={() => setVisibility(v)}
                            className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold capitalize transition-all cursor-pointer ${
                              visibility === v
                                ? "bg-violet-700 text-white"
                                : "bg-paper text-ink hover:bg-paper-hover"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-violet-700 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </p>
                    <p className="text-sm font-bold text-violet-700">
                      {progress}%
                    </p>
                  </div>
                  <div className="h-2 bg-line rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-700 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-line">
                <button
                  onClick={() => setShowUploadForm(false)}
                  className="w-full sm:w-auto px-6 py-2 text-ink hover:bg-paper-hover rounded-xl transition-colors cursor-pointer font-semibold"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={uploadVideoHandler}
                  disabled={loading || (!title || (!videoFile && !videoUrl))}
                  className="w-full sm:w-auto px-6 py-2 bg-violet-700 hover:bg-violet-800 text-white dark:bg-violet-950/40 dark:text-violet-300 border border-transparent dark:border-violet-700/60 dark:hover:border-violet-500 dark:hover:bg-violet-950/80 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Upload Video
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- VIDEO LIST ---------------- */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-ink">
            Uploaded Videos ({videos.length})
          </h3>
        </div>

        {videos.length === 0 ? (
          <div className="bg-surface rounded-2xl border-2 border-dashed border-line p-8 sm:p-12 text-center">
            <Video className="w-12 h-12 sm:w-16 sm:h-16 text-ink-soft/20 mx-auto mb-4" />
            <p className="text-ink font-medium">No videos uploaded yet</p>
            <p className="text-ink-soft text-sm mt-1">
              {effectiveRole === "teacher"
                ? "Upload your first video lecture to get started"
                : "Your teacher hasn't uploaded any videos yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {videos.map((v, index) => (
              <motion.div
                key={v._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group bg-surface rounded-2xl shadow-sm hover:shadow-md transition-all border border-line overflow-hidden"
              >
                {/* Thumbnail Section with Bottom Gradient Overlay */}
                <div className="aspect-video bg-gradient-to-br from-neutral-850 to-neutral-950 relative overflow-hidden">
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      className="w-full h-full object-cover"
                      alt={v.title}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                      <Video size={48} className="text-neutral-700" />
                    </div>
                  )}

                  {/* Bottom gradient overlay for better separation */}
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>

                  {/* Play overlay */}
                  <div 
                    onClick={() => handlePlayVideo(v)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                      <Play
                        fill="currentColor"
                        size={28}
                        className="text-violet-700 translate-x-0.5"
                      />
                    </div>
                  </div>

                  {/* Delete button */}
                  {effectiveRole === "teacher" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteVideo(v._id);
                      }}
                      className="absolute top-3 right-3 bg-surface hover:bg-error border border-line text-error hover:text-white p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-md z-10 cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  {/* Visibility badge */}
                  <div className="absolute bottom-3 left-3 z-10">
                    <span className="bg-surface/90 backdrop-blur text-ink text-xs font-bold px-3 py-1.5 rounded-lg capitalize shadow-sm border border-line">
                      {v.visibility}
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="relative">
                  {/* Top shadow for depth */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-line/20 to-transparent"></div>
                  
                  <div className="p-4 sm:p-5 bg-gradient-to-b from-paper/30 to-surface">
                    <h4 className="text-lg font-bold text-ink mb-2 line-clamp-1 font-display">
                      {v.title}
                    </h4>

                    {v.topic && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-500/10 px-3 py-1.5 rounded-lg mb-3 border border-violet-500/15">
                        <FileText size={12} />
                        {v.topic}
                      </div>
                    )}

                    <p className="text-sm text-ink-soft line-clamp-2 mb-4 leading-relaxed">
                      {v.description || "No description provided"}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-line">
                      <div className="flex items-center gap-2 text-ink-soft">
                        <Calendar size={16} />
                        <span className="text-xs font-medium">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handlePlayVideo(v)}
                        className="flex items-center gap-1.5 text-violet-700 dark:text-violet-400 hover:text-violet-800 hover:underline text-sm font-bold transition-colors cursor-pointer bg-transparent border-none"
                      >
                        Watch
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ---------------- VIDEO PLAYER MODAL ---------------- */}
      <AnimatePresence>
        {showVideoPlayer && selectedVideo && (
          <VideoWatch
            videoUrl={selectedVideo.videoUrl}
            title={selectedVideo.title}
            topic={selectedVideo.topic}
            description={selectedVideo.description}
            onClose={handleClosePlayer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveVideoUpload;