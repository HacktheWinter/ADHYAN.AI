// FrontendStudent/src/hooks/useWebcamProctor.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * Custom hook for webcam proctoring with MediaPipe + photo capture
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Whether webcam proctoring is enabled
 * @param {boolean} options.examStarted - Whether the exam has started
 * @param {number} options.totalStudents - Total students in the class
 * @param {number} options.examDurationMinutes - Exam duration in minutes (null if no limit)
 * @param {React.RefObject} options.videoRef - Ref to the <video> element showing webcam
 * @param {MediaStream|null} options.stream - The webcam MediaStream (used for reliable capture)
 * @param {Function} options.onPhotoUploaded - Callback with the Cloudinary URL after upload
 * @param {string|null} options.quizId - Quiz ID for Cloudinary metadata
 * @param {string|null} options.studentId - Student ID for Cloudinary metadata
 */
export const useWebcamProctor = ({
  enabled = false,
  examStarted = false,
  totalStudents = 0,
  examDurationMinutes = null,
  videoRef = null,
  stream = null,
  onPhotoUploaded = null,
  quizId = null,
  studentId = null,
}) => {
  const [activeWarning, setActiveWarning] = useState(null);
  const [warningCount, setWarningCount] = useState(0);
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);

  const captureTimerRef = useRef(null);
  const shouldCaptureRef = useRef(false);
  const mountedRef = useRef(true);
  const capturedUrlRef = useRef(null);

  // --- MediaPipe specific refs ---
  const faceLandmarkerRef = useRef(null);
  const detectionLoopRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  // Monotonically increasing timestamp for MediaPipe detectForVideo
  const mediapipeTimestampRef = useRef(0);

  // State tracking for thresholds
  const conditionStartTimeRef = useRef({
    faceMissing: null,
    multipleFaces: null,
    lookingAway: null,
  });

  const warningCooldownRef = useRef(0);

  // Thresholds (ms)
  const DETECTION_INTERVAL = 200; // ~5 FPS
  const FACE_MISSING_GRACE_PERIOD = 5000; 
  const MULTIPLE_FACE_DURATION = 2000;
  const LOOK_AWAY_DURATION = 3000;
  const WARNING_COOLDOWN = 5000;

  // Determine photo capture at mount
  useEffect(() => {
    if (!enabled) return;
    if (totalStudents <= 15) {
      shouldCaptureRef.current = true;
    } else {
      const captureRatio = Math.min(15 / totalStudents, 1.0);
      shouldCaptureRef.current = Math.random() < captureRatio;
    }
  }, [enabled, totalStudents]);

  // Schedule photo capture
  useEffect(() => {
    if (!enabled || !examStarted || !shouldCaptureRef.current) return;
    const captureDelay = 30000 + Math.random() * 90000;
    captureTimerRef.current = setTimeout(() => {
      if (mountedRef.current && !capturedUrlRef.current) {
        capturePhoto();
      }
    }, captureDelay);
    return () => {
      if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    };
  }, [enabled, examStarted]);

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    if (!enabled || !examStarted) return;

    let isInitializing = true;
    const initializeMediaPipe = async () => {
      try {
        console.log('[Proctor] Initializing MediaPipe FaceLandmarker...');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );
        
        if (!isInitializing || !mountedRef.current) return;

        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 2, // Up to 2 faces to detect multiple faces
        });

        if (!isInitializing || !mountedRef.current) return;
        faceLandmarkerRef.current = faceLandmarker;
        // Reset the MediaPipe timestamp counter on fresh initialization
        mediapipeTimestampRef.current = 0;
        console.log('[Proctor] MediaPipe FaceLandmarker initialized successfully.');
      } catch (err) {
        console.error('[Proctor] Failed to initialize MediaPipe:', err);
      }
    };

    initializeMediaPipe();

    return () => {
      isInitializing = false;
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, [enabled, examStarted]);

  // Main Detection Loop
  useEffect(() => {
    if (!enabled || !examStarted) return;

    // Reset condition timers when the detection loop (re)starts
    conditionStartTimeRef.current = {
      faceMissing: null,
      multipleFaces: null,
      lookingAway: null,
    };

    const detectFaces = () => {
      if (!mountedRef.current) return;

      const video = videoRef?.current;
      const faceLandmarker = faceLandmarkerRef.current;

      if (video && faceLandmarker && video.readyState >= 2 && !video.paused && video.videoWidth > 0) {
        const now = Date.now();
        
        if (now - lastDetectionTimeRef.current >= DETECTION_INTERVAL) {
          lastDetectionTimeRef.current = now;
          
          try {
            // Use a monotonically increasing timestamp for MediaPipe.
            // MediaPipe VIDEO mode requires timestamps to be strictly increasing.
            // Using performance.now() can cause issues if called multiple times
            // within the same frame or if there are timing quirks.
            mediapipeTimestampRef.current += DETECTION_INTERVAL;
            const result = faceLandmarker.detectForVideo(video, mediapipeTimestampRef.current);
            evaluateDetections(result, now);
          } catch (err) {
            // Log but don't spam — detection errors can be transient
            if (!err.message?.includes('Timestamp must be monotonically increasing')) {
              console.error("[Proctor] Detection error:", err);
            }
          }
        }
      }

      // Check stream health
      if (stream) {
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack || videoTrack.readyState === 'ended') {
          triggerWarning("⚠️ Camera connection lost. Please enable your camera.");
        }
      }

      detectionLoopRef.current = requestAnimationFrame(detectFaces);
    };

    detectionLoopRef.current = requestAnimationFrame(detectFaces);

    return () => {
      if (detectionLoopRef.current) {
        cancelAnimationFrame(detectionLoopRef.current);
      }
    };
  }, [enabled, examStarted, stream]);

  const triggerWarning = (msg) => {
    const now = Date.now();
    if (now - warningCooldownRef.current > WARNING_COOLDOWN) {
      console.log('[Proctor] Warning triggered:', msg);
      setActiveWarning(msg);
      setWarningCount(prev => prev + 1);
      warningCooldownRef.current = now;
      
      // Auto-dismiss after 5s
      setTimeout(() => {
        if (mountedRef.current) setActiveWarning(null);
      }, 5000);
    }
  };

  const evaluateDetections = (result, now) => {
    const numFaces = result.faceLandmarks ? result.faceLandmarks.length : 0;
    const conditions = conditionStartTimeRef.current;

    // 1. Face Missing
    if (numFaces === 0) {
      if (!conditions.faceMissing) conditions.faceMissing = now;
      else if (now - conditions.faceMissing > FACE_MISSING_GRACE_PERIOD) {
        triggerWarning("⚠️ Please stay in front of the camera.");
      }
    } else {
      conditions.faceMissing = null;
    }

    // 2. Multiple Faces
    if (numFaces > 1) {
      if (!conditions.multipleFaces) conditions.multipleFaces = now;
      else if (now - conditions.multipleFaces > MULTIPLE_FACE_DURATION) {
        triggerWarning("⚠️ Only one person should be visible in the camera.");
      }
    } else {
      conditions.multipleFaces = null;
    }

    // 3. Looking Away (heuristic using eye/head position if blendshapes available)
    if (numFaces === 1 && result.faceBlendshapes && result.faceBlendshapes.length > 0) {
      const blendshapes = result.faceBlendshapes[0].categories;
      
      const lookLeft = blendshapes.find(b => b.categoryName === 'eyeLookOutLeft' || b.categoryName === 'eyeLookInRight')?.score || 0;
      const lookRight = blendshapes.find(b => b.categoryName === 'eyeLookOutRight' || b.categoryName === 'eyeLookInLeft')?.score || 0;
      const lookUp = blendshapes.find(b => b.categoryName === 'eyeLookUpLeft')?.score || 0;
      const lookDown = blendshapes.find(b => b.categoryName === 'eyeLookDownLeft')?.score || 0;

      // Heuristic threshold for looking away
      const isLookingAway = (lookLeft > 0.6 || lookRight > 0.6 || lookUp > 0.6 || lookDown > 0.6);

      if (isLookingAway) {
        if (!conditions.lookingAway) conditions.lookingAway = now;
        else if (now - conditions.lookingAway > LOOK_AWAY_DURATION) {
          triggerWarning("⚠️ Please look at the screen.");
        }
      } else {
        conditions.lookingAway = null;
      }
    } else {
       conditions.lookingAway = null;
    }
  };

  /**
   * Capture photo from webcam stream directly (preferred) or from video element (fallback).
   * Returns the uploaded Cloudinary URL, or null on failure.
   */
  const capturePhoto = useCallback(async () => {
    if (capturedUrlRef.current) return capturedUrlRef.current;

    try {
      let canvas;
      if (stream && stream.active) {
        canvas = await captureFromStream(stream);
      } else if (videoRef?.current) {
        const video = videoRef.current;
        canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        return null;
      }

      const base64Image = canvas.toDataURL('image/jpeg', 0.7);
      setPhotoCaptured(true);

      try {
        const { uploadProctorSnapshot } = await import('../api/quizApi');
        const result = await uploadProctorSnapshot(base64Image, quizId, studentId);
        if (result?.url) {
          capturedUrlRef.current = result.url;
          setCapturedPhotoUrl(result.url);
          if (onPhotoUploaded) onPhotoUploaded(result.url);
          return result.url;
        }
      } catch (uploadError) {
        console.error('[Proctor] Failed to upload snapshot:', uploadError);
      }
    } catch (err) {
      console.error('[Proctor] Failed to capture webcam photo:', err);
    }
    return null;
  }, [stream, videoRef, onPhotoUploaded, quizId, studentId]);

  const captureBeforeSubmit = useCallback(async () => {
    if (capturedUrlRef.current) return capturedUrlRef.current;
    if (!shouldCaptureRef.current) return null;
    const url = await capturePhoto();
    return url;
  }, [capturePhoto]);

  const dismissWarning = useCallback(() => {
    setActiveWarning(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    activeWarning,
    warningCount,
    photoCaptured,
    capturedPhotoUrl,
    dismissWarning,
    captureBeforeSubmit,
    shouldCapture: shouldCaptureRef.current,
  };
};

function captureFromStream(stream) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    const track = stream.getVideoTracks()[0];
    if (!track) {
      reject(new Error('No video track in stream'));
      return;
    }

    const settings = track.getSettings();
    const width = settings.width || 640;
    const height = settings.height || 480;

    video.onloadeddata = () => {
      video.play().then(() => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, width, height);
        video.srcObject = null;
        resolve(canvas);
      }).catch(reject);
    };

    video.onerror = () => {
      video.srcObject = null;
      reject(new Error('Failed to load video for capture'));
    };

    setTimeout(() => {
      video.srcObject = null;
      reject(new Error('Capture timeout'));
    }, 5000);

    video.load();
  });
}
