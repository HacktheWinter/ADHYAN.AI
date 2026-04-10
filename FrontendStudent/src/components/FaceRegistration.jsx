import React, { useRef, useState, useCallback } from 'react';
import { Camera, CheckCircle, RefreshCcw, Loader2, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/api';

const FaceRegistration = ({ onComplete }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [images, setImages] = useState([]);
    const [status, setStatus] = useState('idle'); // idle, capturing, registering, success, error
    const [message, setMessage] = useState('');

    const MAX_IMAGES = 3;

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStatus('capturing');
            setMessage('Look straight at the camera and take 3 clear pictures.');
        } catch (error) {
            console.error("Camera error:", error);
            setStatus('error');
            setMessage('Unable to access camera. Please check permissions.');
        }
    };

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            if (blob) {
                setImages(prev => [...prev, blob]);
                if (images.length + 1 >= MAX_IMAGES) {
                    stopCamera();
                    setStatus('idle');
                }
            }
        }, 'image/jpeg', 0.9);
    };

    const removeImage = (indexToRemove) => {
        setImages(images.filter((_, idx) => idx !== indexToRemove));
        if (images.length === MAX_IMAGES && status !== 'registering') {
            startCamera();
        }
    };

    const uploadImages = async () => {
        if (images.length === 0) return;
        
        setStatus('registering');
        setMessage('Processing face metrics securely...');
        
        const formData = new FormData();
        images.forEach((blob, idx) => {
            formData.append('images', blob, `face_${idx}.jpg`);
        });

        try {
            const response = await api.post('/face/register', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                setStatus('success');
                setMessage('Face registered successfully! You can now use Face Recognition for attendance.');
                if (onComplete) setTimeout(onComplete, 2000);
            }
        } catch (error) {
            console.error("Upload error:", error);
            setStatus('error');
            setMessage(error.response?.data?.error || 'Failed to register face. Ensure only one face is visible per image.');
            setImages([]);
        }
    };

    // Cleanup on unmount
    React.useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-xl mx-auto mt-6">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Recognize Your Face</h2>
                <p className="text-gray-500 mt-2">
                    Set up Face Verification to stop proxy attendances. We encrypt and store vector representations privately.
                </p>
            </div>

            <div className="space-y-6">
                {/* Camera View */}
                {status === 'capturing' && (
                    <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-inner mx-auto">
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-10 border-2 border-dashed border-white/50 rounded-full" />
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                            <button
                                onClick={captureImage}
                                className="bg-white text-purple-600 rounded-full p-4 shadow-lg hover:scale-105 active:scale-95 transition-transform"
                                title="Take Snapshot"
                            >
                                <Camera className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="absolute top-4 left-4 right-4 text-center">
                            <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
                                {images.length} / {MAX_IMAGES} Captured
                            </span>
                        </div>
                    </div>
                )}

                {/* Status Messages */}
                {message && status !== 'capturing' && (
                    <AnimatePresence>
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-xl flex items-start gap-3 border ${
                                status === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
                                status === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                                'bg-purple-50 border-purple-200 text-purple-700'
                            }`}
                        >
                            {status === 'success' && <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                            {status === 'error' && <RefreshCcw className="w-5 h-5 mt-0.5 shrink-0" />}
                            {status === 'registering' && <Loader2 className="w-5 h-5 mt-0.5 shrink-0 animate-spin" />}
                            <p className="font-medium text-sm">{message}</p>
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* Previews */}
                {images.length > 0 && (
                    <div className="flex gap-3 justify-center">
                        {images.map((blob, idx) => (
                            <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-purple-100 shadow-sm">
                                <img 
                                    src={URL.createObjectURL(blob)} 
                                    alt={`Capture ${idx}`} 
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                />
                                {status !== 'registering' && (
                                    <button 
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-red-500 transition"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-center gap-3">
                    {status === 'idle' && images.length === 0 && (
                        <button
                            onClick={startCamera}
                            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:bg-purple-700 transition"
                        >
                            Start Camera Setup
                        </button>
                    )}

                    {status === 'idle' && images.length === MAX_IMAGES && (
                        <button
                            onClick={uploadImages}
                            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:bg-purple-700 transition"
                        >
                            <UploadCloud className="w-5 h-5" />
                            Securely Submit Face
                        </button>
                    )}

                    {status === 'error' && (
                        <button
                            onClick={() => {
                                setStatus('idle');
                                setMessage('');
                                setImages([]);
                                startCamera();
                            }}
                            className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold shadow-sm hover:bg-gray-50 transition"
                        >
                            Retake Pictures
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FaceRegistration;
