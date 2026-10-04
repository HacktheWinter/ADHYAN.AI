import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredUser } from "../utils/authStorage";
import API_BASE_URL from "../config";
import PageTransition from "./PageTransition";
import {
  ArrowLeft,
  MessageCircleQuestion,
  Trash2,
  Edit2,
  Send,
  X,
  Check,
  MoreVertical,
  MessageSquare
} from "lucide-react";

export default function TeacherDoubts({ classId, user }) {
  const navigate = useNavigate();
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
        `${API_BASE_URL}/doubts?classId=${classId}`
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
        `${API_BASE_URL}/doubts/reply/${doubtId}`,
        {
          authorId: teacher.id || teacher._id,
          authorName: teacher.name,
          authorRole: teacher.role || "teacher", // added role
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
      await axios.delete(`${API_BASE_URL}/doubts/${doubtId}`);
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
        `${API_BASE_URL}/doubts/delete-reply/${doubtId}`,
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
        `${API_BASE_URL}/doubts/edit-reply/${doubtId}`,
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] font-body">
        <div className="animate-spin h-10 w-10 border-b-2 border-violet-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent font-body text-ink">
      <PageTransition className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 border-b border-line pb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(`/class/${classId}`)}
              className="p-2 sm:p-2.5 bg-surface hover:bg-paper border border-line rounded-xl text-ink-soft hover:text-ink transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                <h1 className="text-xl sm:text-2xl font-bold text-ink font-display">
                  Student Doubts
                </h1>
              </div>
              <p className="text-ink-soft text-sm mt-0.5">
                {doubts.length} {doubts.length === 1 ? "doubt" : "doubts"} pending in this class
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full">
          {doubts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 sm:py-20 bg-surface rounded-3xl border border-line shadow-sm"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full flex items-center justify-center mx-auto mb-5">
                <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-ink mb-2">
                All caught up!
              </h3>
              <p className="text-sm sm:text-base text-ink-soft max-w-sm mx-auto px-4">
                There are no pending doubts from students in this class. Great job!
              </p>
            </motion.div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6 pb-12"
            >
              {doubts.map((doubt) => (
                <motion.div
                  key={doubt._id}
                  variants={itemVariants}
                  className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Doubt Header */}
                  <div className="p-5 sm:p-6 bg-violet-50/50 dark:bg-violet-950/10 border-b border-line">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm">
                          {doubt.authorName?.charAt(0)?.toUpperCase() || "S"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-ink">
                              {doubt.authorName}
                            </span>
                            {doubt.authorRole && (
                              <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-full text-[10px] sm:text-xs font-bold tracking-wide uppercase border border-violet-200 dark:border-violet-800">
                                {doubt.authorRole}
                              </span>
                            )}
                            <span className="text-ink-soft text-xs">
                              • {new Date(doubt.createdAt).toLocaleString(undefined, {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <h2 className="text-base sm:text-lg font-bold text-ink mb-2 mt-1">
                            {doubt.title}
                          </h2>
                          <p className="text-ink-soft text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                            {doubt.description}
                          </p>
                        </div>
                      </div>

                      {/* Delete Doubt Button */}
                      <button
                        onClick={() => deleteDoubt(doubt._id)}
                        className="p-2 text-ink-soft hover:text-error hover:bg-error/10 rounded-xl transition-colors cursor-pointer flex-shrink-0"
                        title="Delete doubt"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Replies Section */}
                  <div className="p-5 sm:p-6 bg-surface flex-1">
                    {doubt.replies.length > 0 && (
                      <div className="space-y-4 mb-6">
                        {doubt.replies.map((reply, index) => {
                          const isTeacher = reply.authorRole === 'teacher';
                          
                          return (
                            <div
                              key={index}
                              className={`flex gap-3 sm:gap-4 ${isTeacher ? 'pl-6 sm:pl-12' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm ${isTeacher ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600' : 'bg-gradient-to-br from-gray-500 to-gray-700'}`}>
                                {reply.authorName?.charAt(0)?.toUpperCase() || "U"}
                              </div>
                              <div className="flex-1 bg-paper border border-line rounded-2xl rounded-tl-none p-4 relative group">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-ink text-sm">
                                      {reply.authorName}
                                    </span>
                                    {isTeacher && (
                                      <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-full text-[10px] font-bold tracking-wide uppercase border border-violet-200 dark:border-violet-800">
                                        Teacher
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Edit/Delete Reply Actions */}
                                  {reply.authorId === (teacher.id || teacher._id) && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 bg-paper pl-2">
                                      {editingReply?.doubtId === doubt._id && editingReply?.index === index ? (
                                        null // Hide actions when editing
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => {
                                              setEditingReply({ doubtId: doubt._id, index });
                                              setEditReplyText(reply.message);
                                            }}
                                            className="p-1.5 text-ink-soft hover:text-violet-600 dark:hover:text-violet-400 bg-surface rounded-md border border-line cursor-pointer"
                                            title="Edit reply"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => deleteReply(doubt._id, index)}
                                            className="p-1.5 text-ink-soft hover:text-error bg-surface rounded-md border border-line cursor-pointer"
                                            title="Delete reply"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {editingReply?.doubtId === doubt._id && editingReply?.index === index ? (
                                  <div className="mt-2">
                                    <textarea
                                      className="w-full border border-violet-300 dark:border-violet-700 bg-surface text-ink px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none min-h-[80px] text-sm"
                                      value={editReplyText}
                                      onChange={(e) => setEditReplyText(e.target.value)}
                                      autoFocus
                                    />
                                    <div className="flex gap-2 mt-2 justify-end">
                                      <button
                                        onClick={() => {
                                          setEditingReply(null);
                                          setEditReplyText("");
                                        }}
                                        className="px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-surface rounded-lg transition-colors border border-line cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => saveReplyEdit(doubt._id, index)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                                      >
                                        <Check className="w-3 h-3" /> Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">
                                    {reply.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reply Input Box */}
                    <div className="flex gap-3 mt-auto items-end pt-4 border-t border-line/50">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm mb-1 hidden sm:flex">
                        {teacher.name?.charAt(0)?.toUpperCase() || "T"}
                      </div>
                      
                      <div className="flex-1 flex items-end gap-2 bg-paper hover:bg-surface border border-line rounded-3xl transition-all focus-within:ring-2 focus-within:ring-violet-500/50 focus-within:border-violet-500 shadow-sm pl-4 pr-1.5 py-1.5">
                        <textarea
                          placeholder="Write a reply to help the student..."
                          className="flex-1 bg-transparent text-ink placeholder:text-ink-soft focus:outline-none resize-none text-sm py-1.5 max-h-[120px] overflow-y-auto scrollbar-hide"
                          rows="1"
                          value={replyText[doubt._id] || ""}
                          onChange={(e) => {
                            setReplyText({ ...replyText, [doubt._id]: e.target.value });
                            e.target.style.height = "auto";
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendReply(doubt._id);
                            }
                          }}
                        />
                        <button
                          onClick={() => sendReply(doubt._id)}
                          disabled={!replyText[doubt._id]?.trim()}
                          className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-violet-600 text-white hover:bg-violet-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm active:scale-90"
                          title="Send reply"
                        >
                          <Send className="w-4 h-4 ml-0.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </PageTransition>
    </div>
  );
}