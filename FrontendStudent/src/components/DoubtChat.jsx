import React, { useEffect, useState } from "react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";
import API_BASE_URL from "../config";

export default function DoubtChat() {
  const { classInfo } = useOutletContext();
  const [doubts, setDoubts] = useState([]);
  const [newDoubt, setNewDoubt] = useState({ title: "", description: "" });
  const [replyText, setReplyText] = useState({});
  const [editingDoubtId, setEditingDoubtId] = useState(null);
  const [editText, setEditText] = useState("");

  // Fetch doubts
  const loadDoubts = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/doubts/${classInfo.classId}`
      );
      setDoubts(res.data);
    } catch (err) {
      console.error("Failed to load doubts");
    }
  };

  useEffect(() => {
    loadDoubts();
  }, []);

  // Post doubt
  const postDoubt = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/doubts`, {
        classId: classInfo.classId,
        authorId: classInfo.studentId,
        authorName: classInfo.studentName,
        authorRole: classInfo.studentRole,
        profilePhoto: classInfo.profilePhoto,
        title: newDoubt.title,
        description: newDoubt.description,
      });

      setDoubts([res.data, ...doubts]);
      setNewDoubt({ title: "", description: "" });
    } catch (err) {
      console.error("Error posting doubt:", err);
    }
  };

  // Reply to doubt
  const postReply = async (id) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/doubts/reply/${id}`,
        {
          classId: classInfo.classId,
          authorId: classInfo.studentId,
          authorName: classInfo.studentName,
          authorRole: classInfo.studentRole,
          profilePhoto: classInfo.profilePhoto,
          message: replyText[id],
        }
      );

      setDoubts(
        doubts.map((d) =>
          d._id === id ? { ...d, replies: [...d.replies, res.data] } : d
        )
      );

      setReplyText({ ...replyText, [id]: "" });
    } catch (error) {
      console.error("Failed to reply");
    }
  };

  // Delete doubt
  const deleteDoubt = async (id) => {
    await axios.delete(`${API_BASE_URL}/doubts/${id}`);
    setDoubts(doubts.filter((d) => d._id !== id));
  };

  // Edit doubt
  const saveEdit = async (id) => {
    try {
      const res = await axios.put(
        `${API_BASE_URL}/doubts/edit/${id}`,
        { description: editText }
      );

      setDoubts(
        doubts.map((d) => (d._id === id ? { ...d, description: editText } : d))
      );
      setEditingDoubtId(null);
      setEditText("");
    } catch (error) {
      console.error("Failed to edit");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
        <h1 className="text-2xl font-bold text-gray-800">Ask & Discuss</h1>
        <p className="text-sm text-gray-600 mt-1">
          Post your doubts and help your classmates
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Post New Doubt */}
        <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Ask a New Doubt</h2>

          <input
            type="text"
            placeholder="Enter a clear and concise title..."
            className="w-full border border-gray-300 px-4 py-2 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={newDoubt.title}
            onChange={(e) => setNewDoubt({ ...newDoubt, title: e.target.value })}
          />

          <textarea
            placeholder="Describe your doubt in detail..."
            className="w-full border border-gray-300 px-4 py-2 rounded-lg mb-3 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={newDoubt.description}
            onChange={(e) =>
              setNewDoubt({ ...newDoubt, description: e.target.value })
            }
          />

          <button
            onClick={postDoubt}
            disabled={!newDoubt.title.trim() || !newDoubt.description.trim()}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Post Doubt
          </button>
        </div>

        {/* List of doubts */}
        {doubts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-500 text-lg">No doubts yet</p>
            <p className="text-gray-400 text-sm mt-2">Be the first to ask a question!</p>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {doubts.map((doubt) => (
              <div key={doubt._id} className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-lg p-5 border border-gray-200">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">
                      {doubt.title}
                    </h2>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {editingDoubtId === doubt._id ? (
                        <textarea
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mt-2"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                        />
                      ) : (
                        <>
                          <span className="font-medium text-purple-700">
                            {doubt.authorName}
                            {doubt.authorRole && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                                {doubt.authorRole}
                              </span>
                            )}:
                          </span>{" "}
                          {doubt.description}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(doubt.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Edit/Delete buttons */}
                  {doubt.authorId === classInfo.studentId && (
                    <div className="ml-4 flex gap-2 text-xs">
                      {editingDoubtId === doubt._id ? (
                        <>
                          <button
                            onClick={() => saveEdit(doubt._id)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingDoubtId(null);
                              setEditText("");
                            }}
                            className="text-gray-600 hover:text-gray-800 font-medium"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingDoubtId(doubt._id);
                              setEditText(doubt.description);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteDoubt(doubt._id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Replies */}
                {doubt.replies.length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 border-purple-300 space-y-3">
                    {doubt.replies.map((reply, index) => (
                      <div key={index} className="bg-purple-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-purple-900">
                            {reply.authorName}
                            {reply.authorRole && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full text-xs font-medium">
                                {reply.authorRole}
                              </span>
                            )}:
                          </span>{" "}
                          <span className="text-gray-700">{reply.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply box */}
                <div className="flex gap-2 mt-4">
                  <input
                    type="text"
                    placeholder="Write your reply..."
                    className="flex-1 border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={replyText[doubt._id] || ""}
                    onChange={(e) =>
                      setReplyText({ ...replyText, [doubt._id]: e.target.value })
                    }
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && replyText[doubt._id]?.trim()) {
                        postReply(doubt._id);
                      }
                    }}
                  />

                  <button
                    onClick={() => postReply(doubt._id)}
                    disabled={!replyText[doubt._id]?.trim()}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}