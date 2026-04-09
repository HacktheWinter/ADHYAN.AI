import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Loader2, QrCode, ZoomIn, ZoomOut, Focus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QRCodeReader,
  HTMLCanvasElementLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from "@zxing/library";
import API from "../api/axios";

// ── Constants ────────────────────────────────────────────────────
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const AUTO_ZOOM_STEP = 0.15;
const AUTO_ZOOM_TARGET = 2.5;
const SCAN_INTERVAL_MS = 180; // ~5.5 FPS decoding
const BOUNDING_BOX_DETECTED_COLOR = "#22c55e"; // green-500

const SeminarQRScanner = ({ onClose }) => {
  // ── State ──────────────────────────────────────────────────────
  const [status, setStatus] = useState("idle"); // idle | processing | success | error
  const [message, setMessage] = useState("");
  const [zoom, setZoom] = useState(1);
  const [maxHardwareZoom, setMaxHardwareZoom] = useState(1);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [qrDetected, setQrDetected] = useState(false);
  const [hintText, setHintText] = useState("Point your camera at the QR code");
  const [cameraReady, setCameraReady] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const tempCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanLockRef = useRef(false);
  const readerRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const autoZoomRef = useRef(false);
  const zoomRef = useRef(1);
  const statusRef = useRef("idle");

  // Keep refs in sync
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // ── Initialize ZXing QRCodeReader ──────────────────────────────
  useEffect(() => {
    readerRef.current = new QRCodeReader();
    // Create a persistent temp canvas for frame grabbing
    tempCanvasRef.current = document.createElement("canvas");
    return () => { readerRef.current = null; };
  }, []);

  // ── Start Camera ───────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }

        // Check hardware zoom capability
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities?.();
          if (capabilities?.zoom) {
            setHasHardwareZoom(true);
            setMaxHardwareZoom(Math.min(capabilities.zoom.max, MAX_ZOOM));
          }
          // Request continuous focus if supported
          try {
            if (capabilities?.focusMode?.includes("continuous")) {
              await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
            }
          } catch { /* focus mode not supported */ }
        }
      } catch (err) {
        console.error("Camera access error:", err);
        if (mounted) {
          setStatus("error");
          setMessage("Camera access denied. Please allow camera permission.");
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  // ── Apply Hardware Zoom ────────────────────────────────────────
  const applyHardwareZoom = useCallback(
    async (level) => {
      if (!hasHardwareZoom || !streamRef.current) return;
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;
      try {
        await track.applyConstraints({
          advanced: [{ zoom: Math.min(level, maxHardwareZoom) }],
        });
      } catch { /* not supported */ }
    },
    [hasHardwareZoom, maxHardwareZoom]
  );

  // ── Draw Bounding Box on Canvas ────────────────────────────────
  const drawBoundingBox = useCallback((points) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    if (!points || points.length < 3) return;

    // Scale from video resolution to display size
    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    const scaleX = displayWidth / vw;
    const scaleY = displayHeight / vh;

    const scaled = points.map((p) => ({
      x: p.getX() * scaleX,
      y: p.getY() * scaleY,
    }));

    const color = BOUNDING_BOX_DETECTED_COLOR;

    // Semi-transparent fill
    ctx.fillStyle = color + "15";
    ctx.beginPath();
    ctx.moveTo(scaled[0].x, scaled[0].y);
    for (let i = 1; i < scaled.length; i++) {
      ctx.lineTo(scaled[i].x, scaled[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(scaled[0].x, scaled[0].y);
    for (let i = 1; i < scaled.length; i++) {
      ctx.lineTo(scaled[i].x, scaled[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Corner markers (thicker short lines)
    ctx.lineWidth = 4;
    const len = 14;
    for (let i = 0; i < scaled.length; i++) {
      const curr = scaled[i];
      const next = scaled[(i + 1) % scaled.length];
      const prev = scaled[(i - 1 + scaled.length) % scaled.length];

      // Direction to next and prev, normalized
      const toNext = normalize(next.x - curr.x, next.y - curr.y);
      const toPrev = normalize(prev.x - curr.x, prev.y - curr.y);

      ctx.beginPath();
      ctx.moveTo(curr.x, curr.y);
      ctx.lineTo(curr.x + toNext.x * len, curr.y + toNext.y * len);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(curr.x, curr.y);
      ctx.lineTo(curr.x + toPrev.x * len, curr.y + toPrev.y * len);
      ctx.stroke();
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // ── Auto Zoom Logic ────────────────────────────────────────────
  const handleAutoZoom = useCallback(
    (points) => {
      if (!points || points.length < 3 || autoZoomRef.current) return;

      const video = videoRef.current;
      if (!video) return;

      const xs = points.map((p) => p.getX());
      const ys = points.map((p) => p.getY());
      const qrWidth = Math.max(...xs) - Math.min(...xs);
      const qrHeight = Math.max(...ys) - Math.min(...ys);
      const vw = video.videoWidth || 1;
      const vh = video.videoHeight || 1;

      // QR occupies what fraction of the frame?
      const qrAreaFraction = (qrWidth * qrHeight) / (vw * vh);

      // If QR is small (< 4% of frame) and we have room to zoom, auto-zoom
      if (qrAreaFraction < 0.04 && zoomRef.current < AUTO_ZOOM_TARGET) {
        autoZoomRef.current = true;
        setHintText("QR detected — zooming in...");

        const zoomStep = () => {
          if (!autoZoomRef.current) return;
          const cur = zoomRef.current;
          if (cur >= AUTO_ZOOM_TARGET) {
            autoZoomRef.current = false;
            return;
          }
          const next = Math.min(cur + AUTO_ZOOM_STEP, AUTO_ZOOM_TARGET);
          setZoom(next);
          applyHardwareZoom(next);
          setTimeout(zoomStep, 120);
        };
        requestAnimationFrame(zoomStep);
      }
    },
    [applyHardwareZoom]
  );

  // ── Continuous Scanning Loop ───────────────────────────────────
  useEffect(() => {
    if (!cameraReady || status !== "idle") return;

    const scan = () => {
      if (statusRef.current !== "idle" || scanLockRef.current) return;

      const video = videoRef.current;
      const reader = readerRef.current;
      const tempCanvas = tempCanvasRef.current;
      if (!video || !reader || !tempCanvas || video.readyState < 2) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      tempCanvas.width = vw;
      tempCanvas.height = vh;
      const ctx = tempCanvas.getContext("2d");
      ctx.drawImage(video, 0, 0, vw, vh);

      try {
        const luminance = new HTMLCanvasElementLuminanceSource(tempCanvas);
        const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
        const result = reader.decode(bitmap);

        if (result) {
          const points = result.getResultPoints();
          setQrDetected(true);
          setHintText("QR Detected! Hold steady...");
          drawBoundingBox(points);
          handleAutoZoom(points);

          // Process
          if (!scanLockRef.current) {
            handleScanResult(result.getText());
          }
        }
      } catch {
        // No QR in this frame
        setQrDetected(false);
        if (!autoZoomRef.current) {
          setHintText("Point your camera at the QR code");
        }
        clearCanvas();
      }
    };

    scanIntervalRef.current = setInterval(scan, SCAN_INTERVAL_MS);

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [cameraReady, status, drawBoundingBox, clearCanvas, handleAutoZoom]);

  // ── Handle Scan Result ─────────────────────────────────────────
  const handleScanResult = async (rawValue) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setStatus("processing");
    autoZoomRef.current = false;
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    try {
      let parsed;
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        setStatus("error");
        setMessage("Invalid QR code. This is not a seminar QR code.");
        setTimeout(() => { setStatus("idle"); scanLockRef.current = false; }, 3000);
        return;
      }

      if (parsed.type !== "seminar" || !parsed.sessionId || !parsed.token) {
        setStatus("error");
        setMessage("This QR code is not for seminar attendance.");
        setTimeout(() => { setStatus("idle"); scanLockRef.current = false; }, 3000);
        return;
      }

      const res = await API.post(`/seminar/attend/${parsed.sessionId}`, {
        token: parsed.token,
      });

      if (res.data?.success) {
        setStatus("success");
        setMessage(res.data.message || "Attendance marked!");
        setTimeout(() => onClose(), 2500);
      } else {
        setStatus("error");
        setMessage(res.data?.error || "Failed to mark attendance");
        setTimeout(() => { setStatus("idle"); scanLockRef.current = false; }, 3000);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to mark attendance.";
      if (errMsg.toLowerCase().includes("already")) {
        setStatus("success");
        setMessage(errMsg);
        setTimeout(() => onClose(), 2500);
      } else {
        setStatus("error");
        setMessage(errMsg);
        setTimeout(() => { setStatus("idle"); scanLockRef.current = false; }, 3000);
      }
    }
  };

  // ── Zoom Controls ──────────────────────────────────────────────
  const handleZoomChange = (newZoom) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    setZoom(clamped);
    applyHardwareZoom(clamped);
    autoZoomRef.current = false;
  };

  // ── Pinch-to-Zoom ─────────────────────────────────────────────
  const lastPinchDistance = useRef(null);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastPinchDistance.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = (dist - lastPinchDistance.current) * 0.01;
      handleZoomChange(zoomRef.current + delta);
      lastPinchDistance.current = dist;
    }
  };

  const handleTouchEnd = () => { lastPinchDistance.current = null; };

  // CSS digital-zoom fallback when hardware zoom isn't available
  const videoTransform = !hasHardwareZoom && zoom > 1
    ? { transform: `scale(${zoom})`, transformOrigin: "center center" }
    : {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="p-5 text-center">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-800 leading-tight">
                Scan Seminar QR
              </h2>
              <p className={`text-xs transition-colors ${qrDetected ? "text-green-500 font-semibold" : "text-gray-400"}`}>
                {hintText}
              </p>
            </div>
          </div>

          {/* Camera Viewport */}
          <div
            className="relative rounded-xl overflow-hidden aspect-square bg-black mb-3 mx-auto max-w-[320px]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={videoTransform}
            />

            {/* Canvas overlay for bounding box */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={videoTransform}
            />

            {/* Scanner guide frame */}
            {status === "idle" && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner markers */}
                <div className="absolute inset-[12%]">
                  <div className={`absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] rounded-tl-md transition-colors ${qrDetected ? "border-green-400" : "border-indigo-400"}`} />
                  <div className={`absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] rounded-tr-md transition-colors ${qrDetected ? "border-green-400" : "border-indigo-400"}`} />
                  <div className={`absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] rounded-bl-md transition-colors ${qrDetected ? "border-green-400" : "border-indigo-400"}`} />
                  <div className={`absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] rounded-br-md transition-colors ${qrDetected ? "border-green-400" : "border-indigo-400"}`} />
                </div>

                {/* Scanning line animation */}
                {!qrDetected && (
                  <div className="absolute left-[12%] right-[12%] top-[12%] bottom-[12%] overflow-hidden">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-scan" />
                  </div>
                )}

                {/* QR Detected badge */}
                {qrDetected && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                    <Focus className="w-3 h-3" />
                    QR Detected
                  </div>
                )}
              </div>
            )}

            {/* Status Overlays */}
            <AnimatePresence>
              {status === "processing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20"
                >
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-2" />
                  <p className="font-semibold text-gray-700">Verifying...</p>
                </motion.div>
              )}

              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-green-50/95 flex flex-col items-center justify-center z-20"
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
                  <p className="font-bold text-gray-800 text-lg">Present!</p>
                  <p className="text-green-600 text-sm px-4">{message}</p>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-red-50/95 flex flex-col items-center justify-center z-20"
                >
                  <AlertCircle className="w-16 h-16 text-red-500 mb-2" />
                  <p className="font-bold text-gray-800">Error</p>
                  <p className="text-red-600 text-sm px-4">{message}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Zoom Controls */}
          {status === "idle" && (
            <div className="flex items-center gap-3 px-2 mb-3">
              <button
                onClick={() => handleZoomChange(zoom - 0.5)}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition cursor-pointer disabled:opacity-40"
                disabled={zoom <= MIN_ZOOM}
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>

              <div className="flex-1">
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={hasHardwareZoom ? maxHardwareZoom : MAX_ZOOM}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 px-0.5">
                  <span>1×</span>
                  <span className="font-bold text-indigo-600">{zoom.toFixed(1)}×</span>
                  <span>{(hasHardwareZoom ? maxHardwareZoom : MAX_ZOOM).toFixed(0)}×</span>
                </div>
              </div>

              <button
                onClick={() => handleZoomChange(zoom + 0.5)}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition cursor-pointer disabled:opacity-40"
                disabled={zoom >= (hasHardwareZoom ? maxHardwareZoom : MAX_ZOOM)}
              >
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}

          {/* Footer */}
          <p className="text-[11px] text-gray-400">
            {zoom > 1 ? `Zoomed ${zoom.toFixed(1)}× · ` : ""}
            Pinch to zoom · Hold steady for best results
          </p>
        </div>
      </motion.div>

      {/* Scanning animation */}
      <style>{`
        @keyframes scan {
          0%   { transform: translateY(0);   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(240px); opacity: 0; }
        }
        .animate-scan { animation: scan 2.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

// ── Utility ──────────────────────────────────────────────────────
function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y) || 1;
  return { x: x / len, y: y / len };
}

export default SeminarQRScanner;
