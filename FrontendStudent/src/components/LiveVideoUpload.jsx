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
  ChevronRight,
  Layout,
  Loader2,
  Clock,
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
      // Standardize response handling
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
      alert("Upload failed. Check console.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- DELETE VIDEO ----------------
  const deleteVideo = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      const res = await api.delete(`/live/videos/${id}`);
      if (res.data.success) {
        setVideos((prev) => prev.filter((v) => v._id !== id));
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ---------------- HEADER SECTION ---------------- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100/50">
            <Layout size={12} />
            Study archives
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Recorded Sessions
          </h1>
          <p className="text-slate-500 font-medium max-w-lg">
            Revisit past lectures, catch up on missed discussions.
          </p>
        </div>

        {role === "teacher" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUploadForm(!showUploadForm)}
            className={`flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black transition-all shadow-2xl ${
              showUploadForm
                ? "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                : "bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-indigo-200"
            }`}
          >
            {showUploadForm ? <X size={20} /> : <CloudUpload size={20} />}
            {showUploadForm ? "Close Publisher" : "Publish Recording"}
          </motion.button>
        )}
      </div>

      {/* ---------------- UPLOAD FORM (OPTIONAL) ---------------- */}
      <AnimatePresence>
        {role === "teacher" && showUploadForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-2xl shadow-indigo-100/50 overflow-hidden"
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
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">
            Available Modules
          </h2>
          <div className="h-px flex-1 bg-slate-100"></div>
          <span className="text-xs font-black text-slate-400">
            {videos.length} Lectures
          </span>
        </div>

        {videos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200"
          >
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-slate-100 mb-8">
              <Video className="text-slate-200" size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              Archives Pending
            </h3>
            <p className="text-slate-500 mt-3 max-w-sm font-medium leading-relaxed">
              Recordings being processed and verified by your instructor. Check
              back soon for new content.
            </p>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {videos.map((v, index) => (
              <motion.div
                key={v._id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 overflow-hidden"
              >
                <div className="aspect-video bg-slate-900 relative overflow-hidden">
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                      alt={v.title}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-100">
                      <Video size={48} className="text-slate-200 mb-3" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Signal Lost
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-[2px]">
                    <motion.a
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      href={v.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-16 h-16 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-2xl transform transition-all"
                    >
                      <Play
                        fill="currentColor"
                        size={28}
                        className="translate-x-0.5"
                      />
                    </motion.a>
                  </div>

                  {role === "teacher" && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        deleteVideo(v._id);
                      }}
                      className="absolute top-5 right-5 bg-white/20 backdrop-blur-md hover:bg-red-500 text-white p-3 rounded-full shadow-lg transition-all transform translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  <div className="absolute bottom-5 left-5 z-10 flex gap-2">
                    <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                      {v.visibility}
                    </span>
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="text-xl font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                      {v.title}
                    </h3>
                  </div>

                  {v.topic && (
                    <div className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 mb-6 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">
                      <FileText size={12} />
                      {v.topic}
                    </div>
                  )}

                  <p className="text-slate-500 text-sm font-medium line-clamp-2 leading-relaxed h-10 mb-8">
                    {v.description ||
                      "Detailed logs and lecture materials are attached to this recording for reference."}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {new Date(v.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <a
                      href={v.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-indigo-600 hover:text-black transition-colors"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                        Study Content
                      </span>
                      <ChevronRight size={14} />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVideoUpload;
