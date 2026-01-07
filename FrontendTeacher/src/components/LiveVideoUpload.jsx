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

      const res = await api.post("/live/videos", formData, {
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(percent);
        },
      });

      if (res.data.success) {
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

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ---------------- HEADER SECTION ---------------- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100/50">
            <Layout size={12} />
            Archive Management
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Lecture Repository
          </h1>
          <p className="text-slate-500 font-medium max-w-lg">
            Manage your digital library of class recordings.
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

      {/* ---------------- UPLOAD FORM (TEACHER) ---------------- */}
      <AnimatePresence>
        {role === "teacher" && showUploadForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-2xl shadow-indigo-100/50 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-20 -mt-20"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <Video size={28} />
                  Lecture Metadata
                </h2>
                <p className="text-indigo-100/80 font-medium mt-1">
                  Enrich your lecture with titles, topics, and relevant
                  descriptions.
                </p>
              </div>
            </div>

            <div className="p-8 md:p-10 space-y-8">
              <div className="grid lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                      Lecture Headline *
                    </label>
                    <input
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-800 placeholder:text-slate-300"
                      placeholder="e.g. Advanced Calculus: Vector Fields"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                      Core Topic
                    </label>
                    <input
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-800 placeholder:text-slate-300"
                      placeholder="e.g. Divergence Theorem"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                    Summary / Description
                  </label>
                  <textarea
                    rows={5}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-600 placeholder:text-slate-300 resize-none"
                    placeholder="Provide students with a summary of the key takeaways..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-10">
                {/* VIDEO UPLOAD AREA */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                    Direct Video Upload
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative group border-2 border-dashed rounded-[2rem] p-10 text-center cursor-pointer transition-all duration-500 ${
                      videoFile
                        ? "border-emerald-500 bg-emerald-50/20"
                        : "border-slate-200 bg-slate-50/50 hover:border-indigo-500 hover:bg-white"
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
                      <div className="relative inline-block group">
                        <img
                          src={thumbnail}
                          className="w-full max-h-52 rounded-2xl object-cover shadow-2xl mx-auto"
                          alt="Video thumbnail preview"
                        />
                        <div className="absolute inset-0 bg-indigo-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                          <CloudUpload className="text-white" size={32} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-6">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                          <CloudUpload
                            className="text-slate-300 group-hover:text-indigo-600"
                            size={36}
                          />
                        </div>
                        <p className="text-slate-800 font-black text-lg">
                          {videoFile ? "Video Selected" : "Choose Video File"}
                        </p>
                        <p className="text-sm text-slate-400 font-medium mt-1">
                          Drag and drop or click to browse
                        </p>
                      </div>
                    )}

                    {videoFile && (
                      <div className="mt-4 inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                        <CheckCircle2 size={14} />
                        {videoFile.name.length > 20
                          ? videoFile.name.slice(0, 20) + "..."
                          : videoFile.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* EXTERNAL LINK AREA */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                      Cloud Sync (YouTube / Drive)
                    </label>
                    <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center gap-4 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                      <Link2 className="text-indigo-500" size={24} />
                      <input
                        className="flex-1 bg-transparent outline-none font-bold text-slate-800 placeholder:text-slate-300"
                        placeholder="Paste URL here..."
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          setVideoFile(null);
                          setThumbnail(null);
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                      Visibility Permission
                    </label>
                    <div className="flex gap-4 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                      {["class", "public"].map((v) => (
                        <button
                          key={v}
                          onClick={() => setVisibility(v)}
                          className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            visibility === v
                              ? "bg-white text-indigo-600 shadow-xl shadow-indigo-100"
                              : "text-slate-400 hover:text-slate-600"
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
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pt-6"
                  >
                    <div className="flex justify-between items-end px-2">
                      <div className="flex items-center gap-2">
                        <Loader2
                          className="animate-spin text-indigo-600"
                          size={18}
                        />
                        <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">
                          Synchronizing with Cloud...
                        </p>
                      </div>
                      <p className="text-lg font-black text-indigo-600">
                        {progress}%
                      </p>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner p-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-end gap-6 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setShowUploadForm(false)}
                  className="px-8 py-3 text-slate-400 font-black uppercase tracking-widest hover:text-slate-800 transition-colors"
                >
                  Discard
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={uploadVideoHandler}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-black disabled:opacity-50 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl shadow-indigo-200 flex items-center gap-3"
                >
                  {loading ? (
                    "Processing..."
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Finalize & Publish
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- VIDEO LIST ---------------- */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">
            Broadcast History
          </h2>
          <div className="h-px flex-1 bg-slate-100"></div>
          <span className="text-xs font-black text-slate-400">
            {videos.length} Modules
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
              Vault is Empty
            </h3>
            <p className="text-slate-500 mt-3 max-w-sm font-medium leading-relaxed">
              {role === "teacher"
                ? "Your lecture archives will appear here once you publish your first recording."
                : "No recordings have been published for this classroom yet."}
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
                      className="absolute top-5 right-5 bg-white shadow-xl hover:bg-rose-500 hover:text-white text-rose-500 p-3 rounded-2xl transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                    >
                      <Trash2 size={20} />
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
                        Access Content
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
