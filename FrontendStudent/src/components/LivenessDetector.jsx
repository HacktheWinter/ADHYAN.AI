import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { ShieldCheck, ShieldAlert, Loader2, RefreshCcw, Camera as CameraIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CHALLENGES = [
    { id: 'left', prompt: "Turn head slightly LEFT", validate: (landmarks) => landmarks[33].x > landmarks[263].x + 0.05 },
    { id: 'right', prompt: "Turn head slightly RIGHT", validate: (landmarks) => landmarks[263].x > landmarks[33].x + 0.05 },
    { id: 'smile', prompt: "Smile widely", validate: (landmarks) => {
        const lipDist = Math.hypot(landmarks[61].x - landmarks[291].x, landmarks[61].y - landmarks[291].y);
        return lipDist > 0.12; 
    }}
];

// Initialize FaceMesh as a singleton to prevent Emscripten global Module race conditions in React Strict Mode
let globalFaceMesh = null;
const getFaceMesh = () => {
    if (!globalFaceMesh) {
        globalFaceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        globalFaceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
    }
    return globalFaceMesh;
};

const LivenessDetector = ({ onVerified, onCancel }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const faceMeshRef = useRef(null);
    const animFrameRef = useRef(null);
    const mountedRef = useRef(true);
    
    const [challenge, setChallenge] = useState(null);
    const [status, setStatus] = useState('initializing'); // initializing, active, success, failed
    const [progress, setProgress] = useState(0); // 100 max
    const [timeLeft, setTimeLeft] = useState(10);
    const [errorMsg, setErrorMsg] = useState('');

    // Refs for AI loop to avoid dependency cycles
    const challengeRef = useRef(null);
    const statusRef = useRef('initializing');
    const onVerifiedRef = useRef(onVerified);
    onVerifiedRef.current = onVerified;

    const startChallenge = useCallback(() => {
        const randomChallenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
        challengeRef.current = randomChallenge;
        statusRef.current = 'active';
        setChallenge(randomChallenge);
        setStatus('active');
        setProgress(0);
        setTimeLeft(10);
        setErrorMsg('');
    }, []);

    // Cleanup function
    const cleanup = useCallback(() => {
        mountedRef.current = false;
        
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        
        if (faceMeshRef.current) {
            faceMeshRef.current.close();
            faceMeshRef.current = null;
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        let validationFrames = 0;

        const initCamera = async () => {
            try {
                // 1. Get camera stream using native browser API (works on all browsers)
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: 'user',
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                    },
                    audio: false,
                });

                if (!mountedRef.current) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;

                // Wait for the video element to be ready
                const video = videoRef.current;
                if (!video) return;
                
                video.srcObject = stream;
                
                // Wait for video to actually load metadata
                await new Promise((resolve) => {
                    video.onloadedmetadata = () => {
                        video.play().then(resolve).catch(resolve);
                    };
                    setTimeout(resolve, 2000);
                });

                if (!mountedRef.current) return;

                // 2. Init FaceMesh
                const faceMesh = getFaceMesh();

                faceMesh.onResults((results) => {
                    if (!mountedRef.current || !canvasRef.current) return;
                    
                    const canvas = canvasRef.current;
                    const canvasCtx = canvas.getContext('2d');
                    canvasCtx.save();
                    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
                    canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
                    canvasCtx.restore();

                    const currentStatus = statusRef.current;
                    const currentChallenge = challengeRef.current;

                    if (currentStatus !== 'active' || !currentChallenge) return;

                    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length === 1) {
                        const landmarks = results.multiFaceLandmarks[0];
                        const isValid = currentChallenge.validate(landmarks);
                        
                        if (isValid) {
                            validationFrames++;
                            const newProgress = Math.min((validationFrames / 10) * 100, 100);
                            setProgress(newProgress);
                            
                            if (validationFrames >= 10) {
                                statusRef.current = 'success';
                                setStatus('success');
                                
                                // Capture the frame from video (more reliable than canvas)
                                const captureCanvas = document.createElement('canvas');
                                captureCanvas.width = video.videoWidth || 640;
                                captureCanvas.height = video.videoHeight || 480;
                                const captureCtx = captureCanvas.getContext('2d');
                                captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
                                
                                captureCanvas.toBlob((blob) => {
                                    if (blob && blob.size > 0) {
                                        setTimeout(() => onVerifiedRef.current(blob), 1000);
                                    } else {
                                        // Fallback: try from display canvas
                                        canvasRef.current?.toBlob((fallbackBlob) => {
                                            if (fallbackBlob) {
                                                setTimeout(() => onVerifiedRef.current(fallbackBlob), 1000);
                                            }
                                        }, 'image/jpeg', 0.9);
                                    }
                                }, 'image/jpeg', 0.9);
                            }
                        } else {
                             validationFrames = Math.max(0, validationFrames - 1);
                             setProgress(Math.min((validationFrames / 10) * 100, 100));
                        }
                        setErrorMsg('');
                    } else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 1) {
                        setErrorMsg('Multiple faces detected. Only one face allowed.');
                    } else {
                        setErrorMsg('Face not detected. Stay in frame.');
                    }
                });

                faceMeshRef.current = faceMesh;

                // 3. Feed video frames to FaceMesh using requestAnimationFrame
                //    (replaces @mediapipe/camera_utils Camera which is unreliable on desktop web)
                let processing = false;
                
                const processFrame = async () => {
                    if (!mountedRef.current || !video || video.readyState < 2) {
                        animFrameRef.current = requestAnimationFrame(processFrame);
                        return;
                    }
                    
                    if (!processing && faceMeshRef.current) {
                        processing = true;
                        try {
                            await faceMeshRef.current.send({ image: video });
                        } catch (e) {
                            // FaceMesh can throw on rapid unmount, ignore
                        }
                        processing = false;
                    }
                    
                    animFrameRef.current = requestAnimationFrame(processFrame);
                };

                // Start the challenge and begin processing
                startChallenge();
                animFrameRef.current = requestAnimationFrame(processFrame);

            } catch (err) {
                console.error("Camera/FaceMesh init failed:", err);
                if (mountedRef.current) {
                    statusRef.current = 'failed';
                    setStatus('failed');
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setErrorMsg('Camera permission denied. Please allow camera access in your browser settings.');
                    } else if (err.name === 'NotFoundError') {
                        setErrorMsg('No camera found on this device.');
                    } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
                        setErrorMsg('Camera is in use by another application. Close other tabs using the camera.');
                    } else {
                        setErrorMsg('Camera access failed. Ensure your browser supports webcam access (HTTPS required).');
                    }
                }
            }
        };

        initCamera();

        return cleanup;
    }, [startChallenge, cleanup]);

    // Timer logic
    useEffect(() => {
        if (status !== 'active') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    statusRef.current = 'failed';
                    setStatus('failed');
                    setErrorMsg('Time expired. Please try again.');
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [status]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
                <div className="bg-purple-600 px-6 py-4 flex justify-between items-center text-white">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" /> Liveness Verification
                    </h2>
                    {status === 'active' && <div className="font-mono bg-black/20 px-3 py-1 rounded-full text-sm font-bold">{timeLeft}s</div>}
                </div>

                <div className="p-6 text-center space-y-4">
                    {status === 'initializing' && (
                        <div className="py-12 flex flex-col items-center">
                            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                            <p className="text-gray-500 font-medium">Starting Camera...</p>
                            <p className="text-xs text-gray-400 mt-2">If prompted, allow camera access</p>
                        </div>
                    )}

                    <div className={`relative rounded-2xl overflow-hidden aspect-square bg-gray-900 shadow-inner max-w-[300px] mx-auto ${status === 'initializing' ? 'hidden' : 'block'}`}>
                        {/* Hidden video element — used as source for FaceMesh + blob capture */}
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] opacity-0 pointer-events-none"
                        />
                        {/* Visible canvas — displays processed frames */}
                        <canvas ref={canvasRef} width="640" height="480" className="w-full h-full object-cover transform scale-x-[-1]" />
                        
                        <AnimatePresence>
                            {status === 'active' && (
                                <motion.div 
                                    className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md text-white rounded-xl py-3 px-4 shadow-lg border border-white/20"
                                >
                                    <p className="text-xl font-extrabold uppercase tracking-wide">{challenge?.prompt}</p>
                                    <div className="w-full bg-gray-700 h-2 mt-3 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                    </div>
                                    {errorMsg && <p className="text-rose-400 text-xs mt-2 font-bold">{errorMsg}</p>}
                                </motion.div>
                            )}

                            {status === 'success' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-emerald-500/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white">
                                    <ShieldCheck className="w-20 h-20 mb-4" />
                                    <h3 className="text-2xl font-bold">Liveness Verified</h3>
                                </motion.div>
                            )}

                            {status === 'failed' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center">
                                    <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
                                    <h3 className="text-xl font-bold mb-2">Verification Failed</h3>
                                    <p className="text-sm text-gray-300 mb-6">{errorMsg}</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => {
                                            cleanup();
                                            // Small delay then re-mount triggers useEffect
                                            setTimeout(() => {
                                                mountedRef.current = true;
                                                startChallenge();
                                                // Re-init will happen via the parent re-rendering
                                            }, 100);
                                            // For now, just restart challenge
                                            startChallenge();
                                        }} className="bg-purple-600 hover:bg-purple-500 px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition cursor-pointer">
                                            <RefreshCcw className="w-4 h-4" /> Retry
                                        </button>
                                        <button onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 px-5 py-2.5 rounded-xl font-semibold transition cursor-pointer">
                                            Cancel
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <p className="text-xs text-gray-400 mt-2">Powered by MediaPipe AI — Works in Chrome, Edge, Firefox</p>
                </div>
            </motion.div>
        </div>
    );
};

export default LivenessDetector;
