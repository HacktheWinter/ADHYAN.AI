import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { User, Send, MessageCircle, Clock } from "lucide-react";

const DoubtChat = ({ classId, user }) => {
  // DEBUG LOGS
  console.log("=== DoubtChat Props ===");
  console.log("classId:", classId);
  console.log("user:", user);
  console.log("user.id:", user?.id);
  console.log("user._id:", user?._id);
  console.log("user.name:", user?.name);
  console.log("user.role:", user?.role);
  console.log("======================");

  const [doubts, setDoubts] = useState([]);
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [newDoubtTitle, setNewDoubtTitle] = useState("");
  const [newDoubtDescription, setNewDoubtDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeUsers, setActiveUsers] = useState(0);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch doubts safely
  const fetchDoubts = async () => {
    if (!classId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(
        `http://localhost:5000/api/doubts/${classId}`
      );
      setDoubts(res.data || []);
    } catch (err) {
      console.error("Failed to fetch doubts:", err);
      setError("Failed to load doubts. Please try again.");
      setDoubts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubts();
  }, [classId]);

  // Socket setup
  useEffect(() => {
    if (!classId || !user) return;

    // Initialize socket connection
    socketRef.current = io("http://localhost:5000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("join_class", classId);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setError("Connection lost. Trying to reconnect...");
    });

    // Listen for new doubts
    socket.on("doubt_added", (doubt) => {
      console.log("New doubt received:", doubt);
      setDoubts((prev) => {
        if (prev.some((d) => d._id === doubt._id)) {
          return prev;
        }
        return [doubt, ...prev];
      });
    });

    // Listen for new replies
    socket.on("reply_added", ({ doubtId, reply }) => {
      console.log("New reply received:", doubtId, reply);
      setDoubts((prev) =>
        prev.map((d) =>
          d._id === doubtId
            ? { ...d, replies: [...(d.replies || []), reply] }
            : d
        )
      );

      if (selectedDoubt?._id === doubtId) {
        setSelectedDoubt((prev) => ({
          ...prev,
          replies: [...(prev.replies || []), reply],
        }));
        setTimeout(scrollToBottom, 100);
      }
    });

    // Listen for active users count
    socket.on("active_users_update", ({ count }) => {
      setActiveUsers(count);
    });

    // Listen for errors
    socket.on("error", ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      if (socket) {
        socket.emit("leave_class", classId);
        socket.off("doubt_added");
        socket.off("reply_added");
        socket.off("active_users_update");
        socket.off("error");
        socket.disconnect();
      }
    };
  }, [classId, user, selectedDoubt?._id]);

  const postDoubt = async () => {
    if (!newDoubtTitle.trim()) {
      setError("Please enter a doubt title");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const userId = user?.id || user?._id;
    const userName = user?.name;
    const userRole = user?.role;

    if (!userId || !userName) {
      setError("User information missing. Please refresh the page.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (userRole !== "student") {
      setError("Only students can post doubts");
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const payload = {
        classId: String(classId),
        authorId: String(userId),
        authorName: String(userName),
        title: newDoubtTitle.trim(),
        description: newDoubtDescription.trim(),
      };

      console.log("Posting doubt:", payload);

      const res = await axios.post("http://localhost:5000/api/doubts", payload);

      setNewDoubtTitle("");
      setNewDoubtDescription("");

      setDoubts((prev) => {
        if (prev.some((d) => d._id === res.data._id)) {
          return prev;
        }
        return [res.data, ...prev];
      });

      setError(null);
    } catch (err) {
      console.error("Failed to post doubt:", err);
      setError(
        err.response?.data?.message || "Failed to post doubt. Please try again."
      );
      setTimeout(() => setError(null), 3000);
    }
  };

  const sendReply = async () => {
    console.log("=== Send Reply Debug ===");
    console.log("newMessage:", newMessage);
    console.log("selectedDoubt:", selectedDoubt);
    console.log("user:", user);
    console.log("classId:", classId);
    console.log("=======================");

    if (!newMessage.trim()) {
      console.log("Message is empty");
      return;
    }

    if (!selectedDoubt) {
      setError("No doubt selected. Please select a doubt first.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!selectedDoubt._id) {
      setError("Invalid doubt. Please try selecting the doubt again.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const userId = user?.id || user?._id;
    const userName = user?.name;

    console.log("Extracted userId:", userId);
    console.log("Extracted userName:", userName);

    if (!userId) {
      console.error("User ID is missing!");
      console.error("User object:", user);
      setError("User information missing. Please refresh the page.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!userName) {
      console.error(" User name is missing!");
      setError("User name missing. Please refresh the page.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!classId) {
      setError("Class information missing. Please refresh the page.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const payload = {
        classId: String(classId),
        authorId: String(userId),
        authorName: String(userName),
        message: String(newMessage.trim()),
      };

      console.log("Sending payload:", payload);
      console.log(
        "To URL:",
        `http://localhost:5000/api/doubts${selectedDoubt._id}/replies`
      );

      const res = await axios.post(
        `http://localhost:5000/api/doubts${selectedDoubt._id}/replies`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Reply sent successfully:", res.data);

      setNewMessage("");

      const newReply = res.data;

      setDoubts((prev) =>
        prev.map((d) =>
          d._id === selectedDoubt._id
            ? { ...d, replies: [...(d.replies || []), newReply] }
            : d
        )
      );

      setSelectedDoubt((prev) => ({
        ...prev,
        replies: [...(prev.replies || []), newReply],
      }));

      setTimeout(scrollToBottom, 100);
      setError(null);
    } catch (err) {
      console.error("Full error:", err);
      console.error("Error response:", err.response?.data);

      let errorMessage = "Failed to send reply. Please try again.";

      if (err.response) {
        errorMessage =
          err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = "No response from server. Check if backend is running.";
      } else {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  if (!user || !classId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with active users */}
      <div className="border-b px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            Doubt Section
          </h2>
          {activeUsers > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>{activeUsers} active</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Only students can post doubts */}
      {user.role === "student" && (
        <div className="border-b p-4 bg-white">
          <h3 className="font-semibold mb-3 text-gray-700">Post a New Doubt</h3>
          <input
            type="text"
            placeholder="What's your doubt? (Title)"
            value={newDoubtTitle}
            onChange={(e) => setNewDoubtTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-2 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
            maxLength={100}
          />
          <textarea
            placeholder="Add more details (optional)..."
            value={newDoubtDescription}
            onChange={(e) => setNewDoubtDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-3 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
            rows={3}
            maxLength={500}
          />
          <button
            onClick={postDoubt}
            disabled={!newDoubtTitle.trim()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Post Doubt
          </button>
        </div>
      )}

      {/* Doubts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
              <p className="text-gray-500">Loading doubts...</p>
            </div>
          </div>
        )}

        {!loading && doubts.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No doubts yet</p>
              <p className="text-gray-400 text-sm">
                {user.role === "student"
                  ? "Be the first to ask a question!"
                  : "Students haven't posted any doubts yet."}
              </p>
            </div>
          </div>
        )}

        {!loading &&
          doubts.map((doubt) => (
            <div
              key={doubt._id}
              className={`border rounded-xl p-4 cursor-pointer transition shadow-sm hover:shadow-md ${
                selectedDoubt?._id === doubt._id
                  ? "bg-purple-50 border-purple-300 ring-2 ring-purple-200"
                  : "bg-white border-gray-200 hover:border-purple-200"
              }`}
              onClick={() => setSelectedDoubt(doubt)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {doubt.authorName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">
                      {doubt.authorName}
                    </span>
                    <span className="text-gray-400 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(doubt.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mt-1">
                    {doubt.title}
                  </h3>
                  {doubt.description && (
                    <p className="text-gray-600 text-sm mt-1">
                      {doubt.description}
                    </p>
                  )}
                </div>
              </div>

              {doubt.replies?.length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-purple-200 space-y-2">
                  {doubt.replies.slice(0, 2).map((r, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {r.authorName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">
                          {r.authorName}
                        </p>
                        <p className="text-gray-600 text-sm">{r.message}</p>
                      </div>
                    </div>
                  ))}
                  {doubt.replies.length > 2 && (
                    <p className="text-xs text-purple-600 font-medium">
                      +{doubt.replies.length - 2} more{" "}
                      {doubt.replies.length - 2 === 1 ? "reply" : "replies"}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MessageCircle className="w-4 h-4" />
                  <span>{doubt.replies?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Reply Box */}
      {selectedDoubt && (
        <div className="border-t bg-white">
          {/* Selected doubt header */}
          <div className="px-4 py-3 bg-purple-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Replying to:
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {selectedDoubt.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedDoubt(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Replies list */}
          {selectedDoubt.replies && selectedDoubt.replies.length > 0 && (
            <div className="px-4 py-3 max-h-40 overflow-y-auto bg-gray-50 border-b">
              <div className="space-y-2">
                {selectedDoubt.replies.map((r, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5">
                      {r.authorName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 bg-white rounded-lg p-2 border">
                      <p className="text-xs font-medium text-gray-700">
                        {r.authorName}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {r.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(r.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Input box */}
          <div className="p-4 flex items-center gap-2">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
              placeholder="Write your reply..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendReply();
                }
              }}
            />
            <button
              onClick={sendReply}
              disabled={!newMessage.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoubtChat;
