import React, { useEffect, useState } from "react";
import axios from "axios";
import { getStoredUser } from "../utils/authStorage";

export default function TeacherDoubts({ classId, user }) {
  const [doubts, setDoubts] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [editingReply, setEditingReply] = useState(null);
  const [editReplyText, setEditReplyText] = useState("");
  const [loading, setLoading] = useState(true);

  const teacher = user || getStoredUser() || {};

  // Load doubts for this specific class
  const loadDoubts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `http://localhost:5000/api/doubts?classId=${classId}`
      );
      setDoubts(res.data);
    } catch (err) {
      console.error("Failed to load doubts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      loadDoubts();
    }
  }, [classId]);

  // Post reply
  const sendReply = async (doubtId) => {
    const message = replyText[doubtId]?.trim();
    if (!message) return;

    try {
      const res = await axios.post(
        `http://localhost:5000/api/doubts/reply/${doubtId}`,
        {
          authorId: teacher.id || teacher._id,
          authorName: teacher.name,
          message,
        }
      );

      setDoubts(
        doubts.map((d) =>
          d._id === doubtId ? { ...d, replies: [...d.replies, res.data] } : d
        )
      );

      setReplyText({ ...replyText, [doubtId]: "" });
    } catch (err) {
      console.error("Failed to send reply", err);
      alert("Failed to send reply. Please try again.");
    }
  };

  // Delete doubt
  const deleteDoubt = async (doubtId) => {
    if (!confirm("Are you sure you want to delete this doubt?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/doubts/${doubtId}`);
      setDoubts(doubts.filter((d) => d._id !== doubtId));
    } catch (err) {
      console.error("Failed to delete doubt", err);
      alert("Failed to delete doubt. Please try again.");
    }
  };

  // Delete a reply
  const deleteReply = async (doubtId, index) => {
    if (!confirm("Are you sure you want to delete this reply?")) return;

    try {
      await axios.put(
        `http://localhost:5000/api/doubts/delete-reply/${doubtId}`,
        { index }
      );

      setDoubts(
        doubts.map((d) =>
          d._id === doubtId
            ? {
                ...d,
                replies: d.replies.filter((_, i) => i !== index),
              }
            : d
        )
      );
    } catch (err) {
      console.error("Failed to delete reply", err);
      alert("Failed to delete reply. Please try again.");
    }
  };

  // Save edit reply
  const saveReplyEdit = async (doubtId, index) => {
    const message = editReplyText.trim();
    if (!message) return;

    try {
      await axios.put(
        `http://localhost:5000/api/doubts/edit-reply/${doubtId}`,
        { index, message }
      );

      setDoubts(
        doubts.map((d) =>
          d._id === doubtId
            ? {
                ...d,
                replies: d.replies.map((r, i) =>
                  i === index ? { ...r, message } : r
                ),
              }
            : d
        )
      );

      setEditingReply(null);
      setEditReplyText("");
    } catch (err) {
      console.error("Failed to edit reply", err);
      alert("Failed to edit reply. Please try again.");
    }
  };

  const handleKeyPress = (e, action, ...args) => {
    if (e.key === "Enter") {
      action(...args);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading doubts...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
        <h1 className="text-2xl font-bold text-gray-800">Student Doubts</h1>
        <p className="text-sm text-gray-600 mt-1">
          {doubts.length} {doubts.length === 1 ? "doubt" : "doubts"} in this class
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {doubts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
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
            <p className="text-gray-400 text-sm mt-2">
              Students can post their doubts here
            </p>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {doubts.map((doubt) => (
              <div
                key={doubt._id}
                className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-lg p-5 border border-gray-200"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">
                      {doubt.title}
                    </h2>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      <span className="font-medium text-purple-700">
                        {doubt.authorName}:
                      </span>{" "}
                      {doubt.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(doubt.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Delete doubt */}
                  <button
                    onClick={() => deleteDoubt(doubt._id)}
                    className="ml-4 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                    title="Delete doubt"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                {/* Replies */}
                {doubt.replies.length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 border-purple-300 space-y-3">
                    {doubt.replies.map((reply, index) => (
                      <div
                        key={index}
                        className="bg-purple-50 rounded-lg p-3 relative group"
                      >
                        <div className="text-sm">
                          <span className="font-medium text-purple-900">
                            {reply.authorName}:
                          </span>{" "}
                          {editingReply?.doubtId === doubt._id &&
                          editingReply?.index === index ? (
                            <input
                              type="text"
                              className="border border-purple-300 px-3 py-2 rounded-lg w-full mt-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              value={editReplyText}
                              onChange={(e) => setEditReplyText(e.target.value)}
                              onKeyPress={(e) =>
                                handleKeyPress(e, saveReplyEdit, doubt._id, index)
                              }
                              autoFocus
                            />
                          ) : (
                            <span className="text-gray-700">{reply.message}</span>
                          )}
                        </div>

                        {/* Edit/Delete reply buttons */}
                        {reply.authorId === (teacher.id || teacher._id) && (
                          <div className="flex gap-2 text-xs mt-2">
                            {editingReply?.doubtId === doubt._id &&
                            editingReply?.index === index ? (
                              <>
                                <button
                                  onClick={() => saveReplyEdit(doubt._id, index)}
                                  className="text-green-600 hover:text-green-800 font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingReply(null);
                                    setEditReplyText("");
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
                                    setEditingReply({ doubtId: doubt._id, index });
                                    setEditReplyText(reply.message);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteReply(doubt._id, index)}
                                  className="text-red-600 hover:text-red-800 font-medium"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
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
                    onKeyPress={(e) => handleKeyPress(e, sendReply, doubt._id)}
                  />

                  <button
                    onClick={() => sendReply(doubt._id)}
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