import { extractEmbedding } from '../config/faceModel.js';
import { getPineconeIndex } from '../config/pinecone.js';
import User from '../models/User.js';

export const registerFace = async (req, res) => {
    try {
        const studentId = req.user._id.toString();
        let files = req.files; // expecting an array of images (e.g. from multer)
        
        // Normalize files to an array in case multer or another middleware attached an object
        if (files && !Array.isArray(files)) {
            files = files.images || Object.values(files).flat();
        }

        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, error: "No images provided" });
        }

        const index = getPineconeIndex();
        const vectorsToUpsert = [];

        for (let i = 0; i < files.length; i++) {
            let embedding;
            try {
                embedding = await extractEmbedding(files[i].buffer);
            } catch (err) {
                const status = err.statusCode || 500;
                return res.status(status).json({
                    success: false,
                    error: `Image ${i + 1}: ${err.message}`
                });
            }

            vectorsToUpsert.push({
                id: `${studentId}_${i + 1}`,
                values: embedding,
                metadata: { studentId }
            });
        }

        // Cleanup old vectors for this student to avoid stale data
        const oldIds = [1, 2, 3, 4, 5].map(i => `${studentId}_${i}`);
        try {
            await index.deleteMany(oldIds);
        } catch (deleteErr) {
            try {
                // Fallback for different Pinecone client versions
                await index.delete({ ids: oldIds });
            } catch(e2) {
                console.warn("Could not delete old vectors:", deleteErr.message);
            }
        }

        if (vectorsToUpsert.length === 0) {
            return res.status(400).json({ success: false, error: "Failed to generate face embeddings. Ensure your face is clearly visible." });
        }

        // Upsert to Pinecone
        try {
            await index.upsert(vectorsToUpsert);
        } catch(err) {
            await index.upsert({ records: vectorsToUpsert });
        }

        // Update User Model
        await User.findByIdAndUpdate(studentId, { isFaceRegistered: true });

        return res.status(200).json({ success: true, message: "Face registered successfully" });

    } catch (error) {
        console.error("Face registration error:", error);
        return res.status(500).json({ success: false, error: "Server error during registration" });
    }
};
export const checkRegistrationStatus = async (req, res) => {
    try {
        const studentId = req.user._id;
        const user = await User.findById(studentId).select('isFaceRegistered');
        
        return res.status(200).json({ 
            success: true, 
            isRegistered: user?.isFaceRegistered || false 
        });
    } catch (error) {
        console.error("Check registration error:", error);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
