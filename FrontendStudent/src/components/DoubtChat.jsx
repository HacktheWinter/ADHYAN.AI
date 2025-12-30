import React, { useEffect, useState } from "react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";

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
        `http://localhost:5000/api/doubts/${classInfo.classId}`
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
      const res = await axios.post("http://localhost:5000/api/doubts", {
        classId: classInfo.classId,
        authorId: classInfo.studentId,
        authorName: classInfo.studentName,
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
        `http://localhost:5000/api/doubts/reply/${id}`,
        {
          classId: classInfo.classId,
          authorId: classInfo.studentId,
          authorName: classInfo.studentName,
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
    await axios.delete(`http://localhost:5000/api/doubts/${id}`);
    setDoubts(doubts.filter((d) => d._id !== id));
  };

  // Edit doubt
  const saveEdit = async (id) => {
    try {
      const res = await axios.put(
        `http://localhost:5000/api/doubts/edit/${id}`,
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
    <div className="max-w-4xl mx-auto">
      {/* Post New Doubt */}
      <div className="p-5 bg-white rounded-xl shadow mb-6">
        <h2 className="text-xl font-bold mb-3">Ask a New Doubt</h2>

        <input
          type="text"
          placeholder="Doubt title"
          className="w-full border px-3 py-2 rounded mb-3"
          value={newDoubt.title}
          onChange={(e) => setNewDoubt({ ...newDoubt, title: e.target.value })}
        />

        <textarea
          placeholder="Describe your doubt..."
          className="w-full border px-3 py-2 rounded mb-3"
          value={newDoubt.description}
          onChange={(e) =>
            setNewDoubt({ ...newDoubt, description: e.target.value })
          }
        />

        <button
          onClick={postDoubt}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Post Doubt
        </button>
      </div>

      {/* List of doubts */}
      {doubts.map((doubt) => (
        <div key={doubt._id} className="bg-white p-5 mb-5 rounded-xl shadow">
          {/* Title */}
          <h3 className="text-lg font-bold">{doubt.title}</h3>
          <p className="text-gray-700 mt-1">
            <b>{doubt.authorName}:</b>{" "}
            {editingDoubtId === doubt._id ? (
              <textarea
                className="w-full p-2 border rounded"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
            ) : (
              doubt.description
            )}
          </p>

          {/* Edit/Delete buttons */}
          {doubt.authorId === classInfo.studentId && (
            <div className="flex gap-3 mt-2">
              {editingDoubtId === doubt._id ? (
                <button
                  onClick={() => saveEdit(doubt._id)}
                  className="text-green-600"
                >
                  Save
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingDoubtId(doubt._id);
                    setEditText(doubt.description);
                  }}
                  className="text-blue-600"
                >
                  Edit
                </button>
              )}

              <button
                onClick={() => deleteDoubt(doubt._id)}
                className="text-red-600"
              >
                Delete
              </button>
            </div>
          )}

          {/* Replies */}
          <div className="mt-4 pl-4 border-l-2 border-purple-300">
            {doubt.replies.map((reply, index) => (
              <p key={index} className="mb-2 text-gray-600">
                <b>{reply.authorName}:</b> {reply.message}
              </p>
            ))}
          </div>

          {/* Reply box */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Write a reply..."
              className="flex-1 border px-3 py-2 rounded"
              value={replyText[doubt._id] || ""}
              onChange={(e) =>
                setReplyText({ ...replyText, [doubt._id]: e.target.value })
              }
            />

            <button
              onClick={() => postReply(doubt._id)}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Reply
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}