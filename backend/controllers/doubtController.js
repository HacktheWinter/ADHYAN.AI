import Doubt from "../models/Doubt.js";
import User from "../models/User.js";

/* ---------------------------------------------
   GET ALL DOUBTS (Teacher Panel)
--------------------------------------------- */
export const getAllDoubts = async (req, res) => {
  try {
    const doubts = await Doubt.find().sort({ createdAt: -1 });
    
    // Populate current user data for doubts and replies
    const populatedDoubts = await Promise.all(
      doubts.map(async (doubt) => {
        const doubtObj = doubt.toObject();
        
        // Get current author info
        if (doubtObj.authorId) {
          const author = await User.findById(doubtObj.authorId);
          if (author) {
            doubtObj.authorName = author.name;
            doubtObj.profilePhoto = author.profilePhoto;
            doubtObj.authorRole = author.role;
          }
        }
        
        // Get current info for reply authors
        if (doubtObj.replies && doubtObj.replies.length > 0) {
          doubtObj.replies = await Promise.all(
            doubtObj.replies.map(async (reply) => {
              if (reply.authorId) {
                const replyAuthor = await User.findById(reply.authorId);
                if (replyAuthor) {
                  reply.authorName = replyAuthor.name;
                  reply.profilePhoto = replyAuthor.profilePhoto;
                  reply.authorRole = replyAuthor.role;
                }
              }
              return reply;
            })
          );
        }
        
        return doubtObj;
      })
    );
    
    res.json(populatedDoubts);
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
    
    // Populate current user data for doubts and replies
    const populatedDoubts = await Promise.all(
      doubts.map(async (doubt) => {
        const doubtObj = doubt.toObject();
        
        // Get current author info
        if (doubtObj.authorId) {
          const author = await User.findById(doubtObj.authorId);
          if (author) {
            doubtObj.authorName = author.name;
            doubtObj.profilePhoto = author.profilePhoto;
            doubtObj.authorRole = author.role;
          }
        }
        
        // Get current info for reply authors
        if (doubtObj.replies && doubtObj.replies.length > 0) {
          doubtObj.replies = await Promise.all(
            doubtObj.replies.map(async (reply) => {
              if (reply.authorId) {
                const replyAuthor = await User.findById(reply.authorId);
                if (replyAuthor) {
                  reply.authorName = replyAuthor.name;
                  reply.profilePhoto = replyAuthor.profilePhoto;
                  reply.authorRole = replyAuthor.role;
                }
              }
              return reply;
            })
          );
        }
        
        return doubtObj;
      })
    );
    
    res.json(populatedDoubts);
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
      authorRole: req.body.authorRole,
      profilePhoto: req.body.profilePhoto,
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
      authorRole: req.body.authorRole,
      profilePhoto: req.body.profilePhoto,
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
