import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware.js';
import { registerFace, checkRegistrationStatus } from '../controllers/faceRecognitionController.js';

const router = express.Router();

// Memory storage for fast processing
const storage = multer.memoryStorage();
const upload = multer({ 
    storage, 
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Rate limiting to prevent abuse
const faceApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: { success: false, error: "Too many face verification attempts, please try again later." }
});

router.get(
    '/status',
    authMiddleware,
    authorizeRoles('student'),
    checkRegistrationStatus
);

router.post(
    '/register',
    authMiddleware,
    authorizeRoles('student'),
    faceApiLimiter,
    upload.array('images', 5), // Accept up to 5 images
    registerFace
);

export default router;
