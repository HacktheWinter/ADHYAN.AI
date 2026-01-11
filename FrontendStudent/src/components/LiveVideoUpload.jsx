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
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ---------------- HEADER SECTION ---------------- */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Video className="w-6 h-6" />
              Video Lectures
            </h2>
            <p className="text-gray-600 text-sm">
              Watch recorded lectures and class sessions
            </p>
          </div>

          {effectiveRole === "teacher" && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl cursor-pointer"
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
            className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Video className="w-5 h-5" />
                Upload New Video
              </h3>
              <p className="text-indigo-100 text-sm mt-1">
                Fill in the details and upload your lecture recording
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Title and Topic */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. Introduction to React Hooks"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Topic
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. React Fundamentals"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  placeholder="Describe what students will learn in this lecture..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Video Upload or URL */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload Video File
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      videoFile
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 hover:border-indigo-500 hover:bg-indigo-50"
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
                          videoFile ? "text-green-600" : "text-gray-400"
                        }`}
                      />
                    )}

                    <p className="text-sm font-semibold text-gray-700">
                      {videoFile
                        ? videoFile.name.length > 30
                          ? videoFile.name.slice(0, 30) + "..."
                          : videoFile.name
                        : "Click to upload video"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      MP4, AVI, MOV supported
                    </p>
                  </div>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Or Enter Video URL
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                      <Link2 className="w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        className="flex-1 outline-none"
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Visibility
                      </label>
                      <div className="flex gap-3">
                        {["class", "public"].map((v) => (
                          <button
                            key={v}
                            onClick={() => setVisibility(v)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold capitalize transition-all ${
                              visibility === v
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                    <p className="text-sm font-semibold text-indigo-600 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </p>
                    <p className="text-sm font-bold text-indigo-600">
                      {progress}%
                    </p>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowUploadForm(false)}
                  className="px-6 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={uploadVideoHandler}
                  disabled={loading || (!title || (!videoFile && !videoUrl))}
                  className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
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
          <h3 className="text-xl font-bold text-gray-900">
            Uploaded Videos ({videos.length})
          </h3>
        </div>

        {videos.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No videos uploaded yet</p>
            <p className="text-gray-400 text-sm mt-1">
              {effectiveRole === "teacher"
                ? "Upload your first video lecture to get started"
                : "Your teacher hasn't uploaded any videos yet"}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((v, index) => (
              <motion.div
                key={v._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all border border-gray-100"
              >
                {/* Thumbnail Section with Bottom Gradient Overlay */}
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      className="w-full h-full object-cover"
                      alt={v.title}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video size={48} className="text-gray-600" />
                    </div>
                  )}

                  {/* Bottom gradient overlay for better separation */}
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none"></div>

                  {/* Play overlay */}
                  <div 
                    onClick={() => handlePlayVideo(v)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                      <Play
                        fill="currentColor"
                        size={28}
                        className="text-indigo-600 translate-x-0.5"
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
                      className="absolute top-3 right-3 bg-white hover:bg-red-500 text-red-500 hover:text-white p-2.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-lg z-10"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  {/* Visibility badge */}
                  <div className="absolute bottom-3 left-3 z-10">
                    <span className="bg-white/95 backdrop-blur text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg capitalize shadow-md border border-gray-200">
                      {v.visibility}
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="relative">
                  {/* Top shadow for depth */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-gray-200/50 to-transparent"></div>
                  
                  <div className="p-5 bg-gradient-to-b from-gray-50 to-white">
                    <h4 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                      {v.title}
                    </h4>

                    {v.topic && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg mb-3 border border-indigo-100">
                        <FileText size={12} />
                        {v.topic}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                      {v.description || "No description provided"}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar size={16} />
                        <span className="text-xs font-medium">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handlePlayVideo(v)}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-bold transition-colors cursor-pointer"
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
