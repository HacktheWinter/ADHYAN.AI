import Doubt from "../models/Doubt.js";

// Create a new doubt
export const createDoubt = async (req, res) => {
  try {
    const { classId, authorId, authorName, title, description } = req.body;

    console.log("Create doubt request:");
    console.log("Body:", req.body);

    // Validation
    if (!classId || !authorId || !authorName || !title) {
      console.log("Missing fields");
      return res.status(400).json({
        message: "Missing required fields",
        required: ["classId", "authorId", "authorName", "title"],
        received: { classId, authorId, authorName, title },
      });
    }

    const newDoubt = await Doubt.create({
      classId,
      authorId,
      authorName,
      title,
      description: description || "",
      replies: [],
      createdAt: new Date(),
    });

    console.log("Doubt created:", newDoubt._id);

    const io = req.app.get("io");
    if (io) {
      io.to(classId).emit("doubt_added", newDoubt);
      console.log("Socket event emitted to class:", classId);
    }

    res.status(201).json(newDoubt);
  } catch (err) {
    console.error("Error creating doubt:", err);
    res
      .status(500)
      .json({ message: "Error creating doubt", error: err.message });
  }
};

// Get doubts for a class
export const getDoubts = async (req, res) => {
  try {
    const { classId } = req.params;

    console.log("Get doubts for class:", classId);

    if (!classId) {
      return res.status(400).json({ message: "Class ID is required" });
    }

    const doubts = await Doubt.find({ classId }).sort({ createdAt: -1 });

    console.log("Found", doubts.length, "doubts");

    res.json(doubts);
  } catch (err) {
    console.error("Error fetching doubts:", err);
    res
      .status(500)
      .json({ message: "Error fetching doubts", error: err.message });
  }
};

// Add reply
export const addReply = async (req, res) => {
  try {
    const { doubtId } = req.params;
    const { classId, authorId, authorName, message } = req.body;

    console.log("Add reply request:");
    console.log("Doubt ID:", doubtId);
    console.log("Body:", req.body);

    // Validation
    if (!classId || !authorId || !authorName || !message) {
      console.log(" Missing fields");
      return res.status(400).json({
        message: "Missing required fields",
        required: ["classId", "authorId", "authorName", "message"],
        received: { classId, authorId, authorName, message },
      });
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      console.log("Doubt not found");
      return res.status(404).json({ message: "Doubt not found" });
    }

    console.log("Doubt found:", doubt._id);

    const reply = {
      authorId,
      authorName,
      message,
      createdAt: new Date(),
    };

    doubt.replies.push(reply);
    await doubt.save();

    console.log("Reply saved:", reply);

    const io = req.app.get("io");
    if (io) {
      io.to(classId).emit("reply_added", { doubtId, reply });
      console.log("Socket event emitted to class:", classId);
    }

    res.json(reply);
  } catch (err) {
    console.error(" Error adding reply:", err);
    res.status(500).json({
      message: "Error adding reply",
      error: err.message,
    });
  }
};
