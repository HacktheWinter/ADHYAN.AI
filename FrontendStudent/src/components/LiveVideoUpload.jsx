import React, { useEffect, useState } from "react";
import API from "../api/axios"; // ✅ CORRECT IMPORT
import { Video } from "lucide-react";

export default function LiveVideoUpload({ classId, role }) {
  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    if (classId) fetchVideos();
  }, [classId]);

  // ================= FETCH VIDEOS =================
  const fetchVideos = async () => {
    try {
      const res = await API.get(`/live/videos/${classId}`);
      setVideos(res.data);
    } catch (err) {
      console.error("Failed to fetch videos", err);
    }
  };

  // ================= UPLOAD VIDEO (TEACHER) =================
  const uploadVideo = async () => {
    if (!title || !videoUrl) {
      alert("Title और Video URL डालो");
      return;
    }

    try {
      await API.post("/live/videos", {
        classId,
        title,
        url: videoUrl,
      });

      setTitle("");
      setVideoUrl("");
      fetchVideos();
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* ===== TEACHER UPLOAD ===== */}
      {role === "teacher" && (
        <div className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Upload Lecture</h2>

          <input
            className="border px-3 py-2 w-full mb-3"
            placeholder="Lecture Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="border px-3 py-2 w-full mb-3"
            placeholder="YouTube / Drive Link"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />

          <button
            onClick={uploadVideo}
            className="bg-purple-600 text-white px-4 py-2 rounded"
          >
            Upload
          </button>
        </div>
      )}

      {/* ===== VIDEO LIST (STUDENT + TEACHER) ===== */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((v) => (
          <div key={v._id} className="bg-white rounded-xl shadow border">
            <div className="aspect-video bg-gray-200 flex items-center justify-center">
              <Video className="text-gray-400" size={40} />
            </div>

            <div className="p-4">
              <h3 className="font-semibold">{v.title}</h3>

              <a
                href={v.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-purple-600 text-sm mt-2 inline-block"
              >
                Watch Video
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
