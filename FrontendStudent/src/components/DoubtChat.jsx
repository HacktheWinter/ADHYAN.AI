import React, { useEffect, useState } from "react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";
import { 
  MessageCircleQuestion, 
  Send, 
  Pencil, 
  Trash2, 
  CornerDownRight, 
  MessageSquare,
  Clock,
  X
} from "lucide-react";
import API_BASE_URL from "../config";

export default function DoubtChat() {
  const { classInfo } = useOutletContext();
  const [doubts, setDoubts] = useState([]);
  const [newDoubt, setNewDoubt] = useState({ title: "", description: "" });
  const [replyText, setReplyText] = useState({});
  const [editingDoubtId, setEditingDoubtId] = useState(null);
  const [editText, setEditText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAskForm, setShowAskForm] = useState(false);

  // Fetch doubts
  const loadDoubts = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/doubts/${classInfo.classId}`
      );
      setDoubts(res.data);
    } catch (err) {
      console.error("Failed to load doubts");
    } finally {
      setIsLoading(false);
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
      setShowAskForm(false);
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
    <div className="space-y-6">
      {/* Header & Ask Button */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Class Doubts</h1>
          <p className="text-sm text-gray-500">Post your questions and get answers from teachers and peers</p>
        </div>
        <button
          onClick={() => setShowAskForm(!showAskForm)}
          className="px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-md shadow-purple-600/10 text-sm cursor-pointer"
        >
          {showAskForm ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <MessageCircleQuestion className="w-4 h-4" />
              Ask a Doubt
            </>
          )}
        </button>
      </div>

      {/* Ask a New Doubt Section */}
      {showAskForm && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <MessageCircleQuestion className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Ask a Doubt</h2>
              <p className="text-sm text-gray-500">Provide clear details to get better answers</p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="What's your doubt about? (e.g., How does React useEffect work?)"
              className="w-full border border-gray-200 bg-gray-50/50 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 focus:bg-white transition-all text-sm font-medium placeholder:font-normal"
              value={newDoubt.title}
              onChange={(e) => setNewDoubt({ ...newDoubt, title: e.target.value })}
            />
            
            <textarea
              placeholder="Provide more details so others can help you better..."
              className="w-full border border-gray-200 bg-gray-50/50 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 focus:bg-white transition-all text-sm min-h-[100px] resize-none"
              value={newDoubt.description}
              onChange={(e) => setNewDoubt({ ...newDoubt, description: e.target.value })}
            />

            <div className="flex justify-end pt-1">
              <button
                onClick={postDoubt}
                disabled={!newDoubt.title.trim() || !newDoubt.description.trim()}
                className="px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-purple-600/10 text-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Post Doubt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doubts Feed */}
      <div className="space-y-4">
        {isLoading ? (
          // Skeleton Loader
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-200 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-100 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-2/3"></div>
            </div>
          ))
        ) : doubts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <MessageSquare className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No Doubts Yet</h3>
            <p className="text-gray-500 mt-1 max-w-sm mx-auto">Looks like everything is crystal clear! Be the first to ask a question.</p>
          </div>
        ) : (
          doubts.map((doubt) => (
            <div key={doubt._id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl p-5 sm:p-6 border border-gray-200 group">
              {/* Doubt Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex gap-3 items-start">
                  {doubt.profilePhoto ? (
                    <img src={doubt.profilePhoto} alt={doubt.authorName} className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex flex-col items-center justify-center text-purple-700 font-bold text-lg border border-purple-200 shadow-sm flex-shrink-0">
                      {doubt.authorName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-[17px] font-bold text-gray-900 leading-tight">
                      {doubt.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-gray-700">
                        {doubt.authorName}
                      </span>
                      {doubt.authorRole && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          doubt.authorRole === "teacher" 
                            ? "bg-amber-100 text-amber-800" 
                            : "bg-purple-100 text-purple-700"
                        }`}>
                          {doubt.authorRole}
                        </span>
                      )}
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(doubt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit/Delete Actions */}
                {doubt.authorId === classInfo.studentId && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingDoubtId === doubt._id ? (
                      <button onClick={() => { setEditingDoubtId(null); setEditText(""); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer" title="Cancel">
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { setEditingDoubtId(doubt._id); setEditText(doubt.description); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteDoubt(doubt._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Doubt Body */}
              <div className="pl-[52px]">
                {editingDoubtId === doubt._id ? (
                  <div className="mb-4">
                    <textarea
                      className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[100px] resize-none mb-2"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => saveEdit(doubt._id)}
                        disabled={!editText.trim()}
                        className="px-4 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap mb-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    {doubt.description}
                  </p>
                )}

                {/* Replies Section */}
                <div className="space-y-3 mt-5">
                  {doubt.replies.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                      {doubt.replies.map((reply, index) => (
                        <div key={index} className="flex gap-3">
                          <CornerDownRight className="w-4 h-4 text-gray-300 mt-1.5 flex-shrink-0" />
                          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-100 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-[13px] text-gray-900">
                                {reply.authorName}
                              </span>
                              {reply.authorRole && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  reply.authorRole === "teacher" 
                                    ? "bg-amber-100 text-amber-800" 
                                    : "bg-purple-100 text-purple-700"
                                }`}>
                                  {reply.authorRole}
                                </span>
                              )}
                              <span className="text-gray-300 text-[10px]">•</span>
                              <span className="text-[11px] text-gray-400 font-medium">
                                {new Date(reply.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input */}
                  <div className="flex gap-2 items-center mt-3 pt-3 border-t border-gray-100">
                    <input
                      type="text"
                      placeholder="Add a reply..."
                      className="flex-1 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 px-4 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-sm"
                      value={replyText[doubt._id] || ""}
                      onChange={(e) => setReplyText({ ...replyText, [doubt._id]: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && replyText[doubt._id]?.trim()) {
                          postReply(doubt._id);
                        }
                      }}
                    />
                    <button
                      onClick={() => postReply(doubt._id)}
                      disabled={!replyText[doubt._id]?.trim()}
                      className="p-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}