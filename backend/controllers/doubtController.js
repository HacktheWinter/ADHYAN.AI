import Doubt from "../models/Doubt.js";

/* ---------------------------------------------
   GET ALL DOUBTS (Teacher Panel)
--------------------------------------------- */
export const getAllDoubts = async (req, res) => {
  try {
    const doubts = await Doubt.find().sort({ createdAt: -1 });
    res.json(doubts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch doubts" });
  }
};

/* ---------------------------------------------
   GET DOUBTS BY CLASS ID (Student Panel)
--------------------------------------------- */
export const getDoubtsByClass = async (req, res) => {
  try {
    const doubts = await Doubt.find({ classId: req.params.classId }).sort({
      createdAt: -1,
    });
    res.json(doubts);
  } catch (err) {
    res.status(500).json({ message: "Failed to get doubts" });
  }
};

/* ---------------------------------------------
   POST A DOUBT (Student Only)
--------------------------------------------- */
export const postDoubt = async (req, res) => {
  try {
    const doubt = await Doubt.create({
      classId: req.body.classId,
      authorId: req.body.authorId,
      authorName: req.body.authorName,
      title: req.body.title,
      description: req.body.description,
    });

    res.json(doubt);
  } catch (err) {
    res.status(500).json({ message: "Failed to post doubt" });
  }
};

/* ---------------------------------------------
   EDIT DOUBT (Student Only)
--------------------------------------------- */
export const editDoubt = async (req, res) => {
  try {
    const { title, description } = req.body;

    const updated = await Doubt.findByIdAndUpdate(
      req.params.id,
      { title, description },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to edit doubt" });
  }
};

/* ---------------------------------------------
   DELETE DOUBT (Student or Teacher)
--------------------------------------------- */
export const deleteDoubt = async (req, res) => {
  try {
    await Doubt.findByIdAndDelete(req.params.id);
    res.json({ message: "Doubt deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete doubt" });
  }
};

/* ---------------------------------------------
   ADD REPLY (Student or Teacher)
--------------------------------------------- */
export const addReply = async (req, res) => {
  try {
    const doubt = await Doubt.findById(req.params.id);

    if (!doubt) return res.status(404).json({ message: "Doubt not found" });

    const reply = {
      authorId: req.body.authorId,
      authorName: req.body.authorName,
      message: req.body.message,
      createdAt: Date.now(),
    };

    doubt.replies.push(reply);
    await doubt.save();

    res.json(reply);
  } catch (err) {
    res.status(500).json({ message: "Failed to add reply" });
  }
};

/* ---------------------------------------------
   DELETE A REPLY
--------------------------------------------- */
export const deleteReply = async (req, res) => {
  try {
    const { index } = req.body;
    const doubt = await Doubt.findById(req.params.id);

    if (!doubt) return res.status(404).json({ message: "Doubt not found" });

    doubt.replies.splice(index, 1);
    await doubt.save();

    res.json({ message: "Reply deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete reply" });
  }
};

/* ---------------------------------------------
   EDIT A REPLY
--------------------------------------------- */
export const editReply = async (req, res) => {
  try {
    const { index, message } = req.body;

    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) return res.status(404).json({ message: "Doubt not found" });

    if (!doubt.replies[index])
      return res.status(404).json({ message: "Reply not found" });

    doubt.replies[index].message = message;
    await doubt.save();

    res.json(doubt.replies[index]);
  } catch (err) {
    res.status(500).json({ message: "Failed to edit reply" });
  }
};
