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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const fileInputRef = useRef(null);

  // ---------------- FETCH VIDEOS ----------------
  const fetchVideos = async () => {
    try {
      const res = await api.get(`/live/videos/${classId}`);
      setVideos(res.data);
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
    video.currentTime = 1.5; // Seek a bit into the video to avoid black frame

    video.onloadeddata = () => {
      video.currentTime = 1.5;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      // Maintain aspect ratio
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

      await api.post("/live/videos", formData, {
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(percent);
        },
      });

      // Reset
      setTitle("");
      setTopic("");
      setDescription("");
      setVideoFile(null);
      setVideoUrl("");
      setThumbnail(null);
      setProgress(0);
      setShowUploadForm(false);

      fetchVideos();
    } catch (err) {
      alert("Upload failed");
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
      await api.delete(`/live/videos/${id}`);
      setVideos((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      alert("Delete failed");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ---------------- HEADER SECTION ---------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Lecture Recordings
          </h1>
          <p className="mt-1 text-gray-500">
            Access and manage all live class recordings and resources.
          </p>
        </div>

        {role === "teacher" && (
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
              showUploadForm
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
            }`}
          >
            {showUploadForm ? <X size={20} /> : <Upload size={20} />}
            {showUploadForm ? "Cancel Upload" : "Upload New Lecture"}
          </button>
        )}
      </div>

      {/* ---------------- UPLOAD FORM (TEACHER) ---------------- */}
      <AnimatePresence>
        {role === "teacher" && showUploadForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl shadow-2xl border border-indigo-50 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-indigo-600/5 to-purple-600/5 p-6 md:p-8 border-b border-indigo-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Video className="text-indigo-600" />
                Lecture Details
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Fill in the information below to publish your lecture.
              </p>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                      Lecture Title *
                    </label>
                    <input
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="e.g. Introduction to Quantum Physics"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                      Topic
                    </label>
                    <input
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="e.g. Wave-Particle Duality"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Description
                  </label>
                  <textarea
                    rows={5}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                    placeholder="Provide a brief summary of the lecture..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* VIDEO UPLOAD AREA */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative group border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    videoFile
                      ? "border-green-500 bg-green-50/30"
                      : "border-gray-300 bg-gray-50/50 hover:border-indigo-500 hover:bg-indigo-50/30"
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
                    <div className="relative inline-block">
                      <img
                        src={thumbnail}
                        className="w-full max-h-40 rounded-lg object-cover shadow-md mx-auto"
                        alt="Video thumbnail preview"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <Upload className="text-white" size={24} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                        <Upload
                          className="text-gray-400 group-hover:text-indigo-600"
                          size={28}
                        />
                      </div>
                      <p className="text-gray-700 font-semibold mb-1">
                        Click to Upload Video
                      </p>
                      <p className="text-xs text-gray-500">
                        MP4, MOV, or WEBM (Max 500MB)
                      </p>
                    </div>
                  )}

                  {videoFile && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
                      <CheckCircle2 size={16} />
                      {videoFile.name}
                    </div>
                  )}
                </div>

                {/* EXTERNAL LINK AREA */}
                <div className="space-y-4">
                  <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <label className="flex items-center gap-2 text-sm font-semibold text-indigo-900 mb-3">
                      <Link2 size={18} />
                      External Video Link (YouTube/Vimeo)
                    </label>
                    <div className="relative">
                      <input
                        className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 pl-4 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                        placeholder="https://youtube.com/watch?v=..."
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          setVideoFile(null);
                          setThumbnail(null);
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-indigo-500 mt-2 ml-1">
                      Optional: Link to an external video instead of uploading.
                    </p>
                  </div>

                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Visibility
                    </label>
                    <div className="flex gap-3">
                      {["class", "public"].map((v) => (
                        <button
                          key={v}
                          onClick={() => setVisibility(v)}
                          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold capitalize transition-all ${
                            visibility === v
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                              : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* PROGRESS BAR */}
              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-sm font-bold text-indigo-600">
                      Uploading in progress...
                    </p>
                    <p className="text-sm font-extrabold text-indigo-600">
                      {progress}%
                    </p>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-4 pt-4">
                <button
                  onClick={() => setShowUploadForm(false)}
                  className="px-6 py-2 text-gray-600 font-semibold hover:text-gray-900 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={uploadVideoHandler}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-xl shadow-indigo-100 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    "Publish Video Lecture"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- VIDEO LIST ---------------- */}
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
            <Video className="text-gray-300" size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">No lectures found</h3>
          <p className="text-gray-500 mt-2 max-w-sm">
            {role === "teacher"
              ? "Start by uploading your first live lecture recording for the students."
              : "The teacher hasn't uploaded any recordings for this class yet."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {videos.map((v, index) => (
            <motion.div
              key={v._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="group bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-300 overflow-hidden relative"
            >
              <div className="aspect-video bg-gray-900 relative overflow-hidden">
                {v.thumbnail ? (
                  <img
                    src={v.thumbnail}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                    alt={v.title}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-100">
                    <Video size={48} className="text-gray-300 mb-2" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      No Preview Available
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a
                    href={v.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300"
                  >
                    <Play fill="currentColor" size={24} className="ml-1" />
                  </a>
                </div>

                {role === "teacher" && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      deleteVideo(v._id);
                    }}
                    className="absolute top-4 right-4 bg-white/10 backdrop-blur-md hover:bg-red-500 text-white p-2.5 rounded-2xl shadow-lg transition-all transform translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                <div className="absolute bottom-4 left-4 z-10">
                  <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                    {v.visibility}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors uppercase">
                    {v.title}
                  </h3>
                </div>

                {v.topic && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 mb-3 ml-0.5">
                    <CheckCircle2 size={12} />
                    {v.topic}
                  </div>
                )}

                <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed h-10 mb-6">
                  {v.description ||
                    "No description provided for this lecture recording."}
                </p>

                <div className="flex items-center justify-between pt-5 border-t border-gray-50">
                  <div className="flex items-center gap-4 text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <a
                    href={v.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-indigo-600 text-xs font-black hover:text-indigo-700 transition-colors uppercase tracking-widest"
                  >
                    Watch Now
                    <Play size={10} fill="currentColor" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveVideoUpload;
