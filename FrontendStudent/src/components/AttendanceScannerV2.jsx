import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Focus,
  Flashlight,
  FlashlightOff,
  AlertTriangle,
  Camera,
  CameraOff,
} from "lucide-react";
import {
  QRCodeReader,
  HTMLCanvasElementLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from "@zxing/library";

// ── Constants ────────────────────────────────────────────────────────
const SCAN_INTERVAL_MS = 180; // ~5.5 FPS decoding
const AUTO_ZOOM_STEP = 0.15;
const AUTO_ZOOM_TARGET = 2.5;
const QR_SMALL_THRESHOLD = 0.04; // QR < 4% of frame = "too small"
const QR_MEDIUM_THRESHOLD = 0.08; // QR < 8% = suggest zoom
const BOUNDING_BOX_COLOR = "#22c55e"; // green-500
const RETICLE_IDLE_COLOR = "#a78bfa"; // purple-400
const RETICLE_DETECTED_COLOR = "#34d399"; // emerald-400

// ── Progressive camera constraints (try best first, fallback) ────
const CAMERA_CONSTRAINTS_CHAIN = [
  {
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  },
  {
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  },
  {
    video: {
      facingMode: "environment",
    },
    audio: false,
  },
  {
    video: true,
    audio: false,
  },
];

// ══════════════════════════════════════════════════════════════════════
// AttendanceScannerV2
// ══════════════════════════════════════════════════════════════════════
const AttendanceScannerV2 = ({ onScan, isActive }) => {
  // ── State ──────────────────────────────────────────────────────────
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [qrDetected, setQrDetected] = useState(false);
  const [hintText, setHintText] = useState("Point your camera at the QR code");
  const [hintType, setHintType] = useState("idle"); // idle | detected | tooSmall | zoomHint | noZoom

  // ── Refs ───────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const tempCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const autoZoomRef = useRef(false);
  const zoomRef = useRef(1);
  const isActiveRef = useRef(isActive);
  const mountedRef = useRef(true);
  const lastPinchDistance = useRef(null);
  const hasHardwareZoomRef = useRef(false);
  const maxZoomRef = useRef(1);

  // Keep refs in sync
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { hasHardwareZoomRef.current = hasHardwareZoom; }, [hasHardwareZoom]);
  useEffect(() => { maxZoomRef.current = maxZoom; }, [maxZoom]);

  // ── Initialize ZXing Reader ────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    readerRef.current = new QRCodeReader();
    tempCanvasRef.current = document.createElement("canvas");

    return () => {
      mountedRef.current = false;
      readerRef.current = null;
    };
  }, []);

  // ── Start Camera with Progressive Fallback ─────────────────────────
  useEffect(() => {
    if (!isActive) return;

    let localMounted = true;

    const tryConstraints = async (constraintsList) => {
      for (const constraints of constraintsList) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          return stream;
        } catch (err) {
          // If permission denied, don't retry with weaker constraints
          if (err.name === "NotAllowedError" || err.name === "SecurityError") {
            throw err;
          }
          // Otherwise try next set of constraints
          continue;
        }
      }
      throw new Error("No suitable camera found");
    };

    const startCamera = async () => {
      try {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (!localMounted) return;
          setCameraError(
            window.isSecureContext === false
              ? "Camera requires a secure connection (HTTPS). Please access this site over HTTPS."
              : "Your browser doesn't support camera access. Please use a modern browser like Chrome, Safari, or Firefox."
          );
          return;
        }

        const stream = await tryConstraints(CAMERA_CONSTRAINTS_CHAIN);

        if (!localMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // ── Probe camera capabilities ──
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities?.() || {};

          // Zoom
          if (capabilities.zoom) {
            const zMin = capabilities.zoom.min || 1;
            const zMax = Math.min(capabilities.zoom.max || 1, 10);
            setHasHardwareZoom(true);
            setMinZoom(zMin);
            setMaxZoom(zMax);
            setZoom(zMin);
          }

          // Torch
          if (capabilities.torch) {
            setHasTorch(true);
          }

          // Apply optimal camera settings
          const advancedConstraints = [];

          // Continuous autofocus
          if (capabilities.focusMode?.includes("continuous")) {
            advancedConstraints.push({ focusMode: "continuous" });
          }

          // Continuous white balance
          if (capabilities.whiteBalanceMode?.includes("continuous")) {
            advancedConstraints.push({ whiteBalanceMode: "continuous" });
          }

          // Continuous exposure
          if (capabilities.exposureMode?.includes("continuous")) {
            advancedConstraints.push({ exposureMode: "continuous" });
          }

          if (advancedConstraints.length > 0) {
            try {
              await track.applyConstraints({ advanced: advancedConstraints });
            } catch {
              // Some constraints may fail silently — that's OK
            }
          }
        }

        if (localMounted) {
          setCameraReady(true);
          setCameraError(null);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        if (!localMounted) return;

        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError(
            "Camera access was denied. Please allow camera permission in your browser settings and try again."
          );
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError(
            "No camera found on this device. Please connect a camera and try again."
          );
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setCameraError(
            "Your camera is being used by another app. Please close other apps using the camera and try again."
          );
        } else if (err.name === "OverconstrainedError") {
          setCameraError(
            "We couldn't access your camera with the required settings. Please try a different browser."
          );
        } else {
          setCameraError(
            "We couldn't access your camera. Please check your permissions and try again."
          );
        }
      }
    };

    startCamera();

    return () => {
      localMounted = false;
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      // Clear scan interval
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      setCameraReady(false);
      setTorchOn(false);
    };
  }, [isActive]);

  // ── Apply Hardware Zoom ────────────────────────────────────────────
  const applyHardwareZoom = useCallback(
    async (level) => {
      if (!hasHardwareZoomRef.current || !streamRef.current) return;
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;
      try {
        const clamped = Math.min(level, maxZoomRef.current);
        await track.applyConstraints({
          advanced: [{ zoom: clamped }],
        });
      } catch {
        /* zoom constraint failed — device may not support it at runtime */
      }
    },
    []
  );

  // ── Torch Toggle ───────────────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const newState = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: newState }],
      });
      setTorchOn(newState);
    } catch {
      /* torch not supported at runtime */
    }
  }, [torchOn]);

  // ── Draw Bounding Box ─────────────────────────────────────────────
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

    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    const scaleX = displayWidth / vw;
    const scaleY = displayHeight / vh;

    const scaled = points.map((p) => ({
      x: p.getX() * scaleX,
      y: p.getY() * scaleY,
    }));

    // Semi-transparent fill
    ctx.fillStyle = BOUNDING_BOX_COLOR + "20";
    ctx.beginPath();
    ctx.moveTo(scaled[0].x, scaled[0].y);
    for (let i = 1; i < scaled.length; i++) {
      ctx.lineTo(scaled[i].x, scaled[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = BOUNDING_BOX_COLOR;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(scaled[0].x, scaled[0].y);
    for (let i = 1; i < scaled.length; i++) {
      ctx.lineTo(scaled[i].x, scaled[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Corner markers
    ctx.lineWidth = 4;
    const len = 16;
    for (let i = 0; i < scaled.length; i++) {
      const curr = scaled[i];
      const next = scaled[(i + 1) % scaled.length];
      const prev = scaled[(i - 1 + scaled.length) % scaled.length];

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

  // ── Auto Zoom Logic ────────────────────────────────────────────────
  const handleAutoZoom = useCallback(
    (points) => {
      if (!points || points.length < 3 || autoZoomRef.current) return;
      if (!hasHardwareZoomRef.current) return; // Only auto-zoom with real hardware zoom

      const video = videoRef.current;
      if (!video) return;

      const xs = points.map((p) => p.getX());
      const ys = points.map((p) => p.getY());
      const qrWidth = Math.max(...xs) - Math.min(...xs);
      const qrHeight = Math.max(...ys) - Math.min(...ys);
      const vw = video.videoWidth || 1;
      const vh = video.videoHeight || 1;
      const qrAreaFraction = (qrWidth * qrHeight) / (vw * vh);

      if (qrAreaFraction < QR_SMALL_THRESHOLD && zoomRef.current < AUTO_ZOOM_TARGET) {
        autoZoomRef.current = true;
        setHintText("QR detected — zooming in...");
        setHintType("detected");

        const zoomStep = () => {
          if (!autoZoomRef.current || !mountedRef.current) return;
          const cur = zoomRef.current;
          const target = Math.min(AUTO_ZOOM_TARGET, maxZoomRef.current);
          if (cur >= target) {
            autoZoomRef.current = false;
            return;
          }
          const next = Math.min(cur + AUTO_ZOOM_STEP, target);
          setZoom(next);
          applyHardwareZoom(next);
          setTimeout(zoomStep, 120);
        };
        requestAnimationFrame(zoomStep);
      }
    },
    [applyHardwareZoom]
  );

  // ── Determine hint based on QR area fraction ───────────────────────
  const updateHint = useCallback((qrAreaFraction, detected) => {
    if (!detected) {
      if (!autoZoomRef.current) {
        setHintText("Point your camera at the QR code");
        setHintType("idle");
      }
      return;
    }

    if (qrAreaFraction < QR_SMALL_THRESHOLD) {
      if (hasHardwareZoomRef.current) {
        setHintText("QR found — move closer or zoom in");
        setHintType("tooSmall");
      } else {
        setHintText("QR found — move closer for better scanning");
        setHintType("noZoom");
      }
    } else if (qrAreaFraction < QR_MEDIUM_THRESHOLD) {
      setHintText("QR detected — hold steady...");
      setHintType("zoomHint");
    } else {
      setHintText("QR Detected! Processing...");
      setHintType("detected");
    }
  }, []);

  // ── Continuous Scanning Loop ───────────────────────────────────────
  useEffect(() => {
    if (!cameraReady || !isActive) return;

    const scan = () => {
      if (!isActiveRef.current) return;

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

          // Calculate QR size fraction for hints
          if (points && points.length >= 3) {
            const xs = points.map((p) => p.getX());
            const ys = points.map((p) => p.getY());
            const qrW = Math.max(...xs) - Math.min(...xs);
            const qrH = Math.max(...ys) - Math.min(...ys);
            const fraction = (qrW * qrH) / (vw * vh);
            updateHint(fraction, true);
          } else {
            setHintText("QR Detected! Processing...");
            setHintType("detected");
          }

          drawBoundingBox(points);
          handleAutoZoom(points);

          // Emit scan result in format compatible with existing handleScan
          const rawValue = result.getText();
          if (rawValue && onScan) {
            onScan([{ rawValue }]);
          }
        }
      } catch {
        // No QR found in this frame — normal
        setQrDetected(false);
        updateHint(0, false);
        clearCanvas();
      }
    };

    scanIntervalRef.current = setInterval(scan, SCAN_INTERVAL_MS);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [cameraReady, isActive, drawBoundingBox, clearCanvas, handleAutoZoom, updateHint, onScan]);

  // ── Zoom Controls ──────────────────────────────────────────────────
  const handleZoomChange = useCallback(
    (newZoom) => {
      const clamped = Math.max(minZoom, Math.min(maxZoom, newZoom));
      setZoom(clamped);
      applyHardwareZoom(clamped);
      autoZoomRef.current = false;
    },
    [minZoom, maxZoom, applyHardwareZoom]
  );

  // ── Pinch-to-Zoom ─────────────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (e.touches.length === 2 && lastPinchDistance.current !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = (dist - lastPinchDistance.current) * 0.01;
        handleZoomChange(zoomRef.current + delta);
        lastPinchDistance.current = dist;
      }
    },
    [handleZoomChange]
  );

  const handleTouchEnd = useCallback(() => {
    lastPinchDistance.current = null;
  }, []);

  // ── Hint color helpers ─────────────────────────────────────────────
  const hintColor =
    hintType === "detected"
      ? "text-emerald-400 font-semibold"
      : hintType === "tooSmall" || hintType === "noZoom"
      ? "text-amber-400 font-medium"
      : hintType === "zoomHint"
      ? "text-emerald-300 font-medium"
      : "text-white/70";

  const reticleColor = qrDetected ? RETICLE_DETECTED_COLOR : RETICLE_IDLE_COLOR;

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════

  // ── Camera Error State ─────────────────────────────────────────────
  if (cameraError) {
    return (
      <div className="relative rounded-2xl overflow-hidden aspect-[3/4] sm:aspect-square bg-gray-900 mx-auto max-w-[400px] flex flex-col items-center justify-center p-6 text-center">
        <CameraOff className="w-14 h-14 text-red-400 mb-4" />
        <p className="text-white font-semibold text-lg mb-2">Camera Unavailable</p>
        <p className="text-gray-400 text-sm leading-relaxed">{cameraError}</p>
        <button
          onClick={() => {
            setCameraError(null);
            setCameraReady(false);
            window.location.reload();
          }}
          className="mt-5 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition cursor-pointer text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-[400px] w-full">
      {/* Camera Viewport */}
      <div
        className="relative rounded-2xl overflow-hidden aspect-[3/4] sm:aspect-square bg-black shadow-inner"
        onTouchStart={hasHardwareZoom ? handleTouchStart : undefined}
        onTouchMove={hasHardwareZoom ? handleTouchMove : undefined}
        onTouchEnd={hasHardwareZoom ? handleTouchEnd : undefined}
        style={{ touchAction: "none" }}
      >
        {/* Video Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Canvas overlay for bounding box */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Loading state */}
        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-900">
            <Camera className="w-10 h-10 text-purple-400 animate-pulse mb-3" />
            <p className="text-white/70 text-sm font-medium">Starting camera...</p>
          </div>
        )}

        {/* Scanner Reticle */}
        {isActive && cameraReady && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark overlay outside scan area */}
            <div className="absolute inset-0 bg-black/30" />
            <div
              className="absolute left-[10%] right-[10%] top-[10%] bottom-[10%] bg-transparent"
              style={{
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                borderRadius: "12px",
              }}
            />

            {/* Corner brackets */}
            <div className="absolute left-[10%] right-[10%] top-[10%] bottom-[10%]">
              {/* Top-left */}
              <div
                className="absolute top-0 left-0 w-8 h-8 transition-colors duration-300"
                style={{
                  borderTop: `3.5px solid ${reticleColor}`,
                  borderLeft: `3.5px solid ${reticleColor}`,
                  borderTopLeftRadius: "8px",
                }}
              />
              {/* Top-right */}
              <div
                className="absolute top-0 right-0 w-8 h-8 transition-colors duration-300"
                style={{
                  borderTop: `3.5px solid ${reticleColor}`,
                  borderRight: `3.5px solid ${reticleColor}`,
                  borderTopRightRadius: "8px",
                }}
              />
              {/* Bottom-left */}
              <div
                className="absolute bottom-0 left-0 w-8 h-8 transition-colors duration-300"
                style={{
                  borderBottom: `3.5px solid ${reticleColor}`,
                  borderLeft: `3.5px solid ${reticleColor}`,
                  borderBottomLeftRadius: "8px",
                }}
              />
              {/* Bottom-right */}
              <div
                className="absolute bottom-0 right-0 w-8 h-8 transition-colors duration-300"
                style={{
                  borderBottom: `3.5px solid ${reticleColor}`,
                  borderRight: `3.5px solid ${reticleColor}`,
                  borderBottomRightRadius: "8px",
                }}
              />
            </div>

            {/* Scanning line animation */}
            {!qrDetected && (
              <div className="absolute left-[10%] right-[10%] top-[10%] bottom-[10%] overflow-hidden rounded-xl">
                <div
                  className="w-full h-0.5 animate-scanner-line"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, ${RETICLE_IDLE_COLOR} 50%, transparent 100%)`,
                  }}
                />
              </div>
            )}

            {/* QR Detected pulse ring */}
            {qrDetected && (
              <div className="absolute left-[10%] right-[10%] top-[10%] bottom-[10%] rounded-xl border-2 border-emerald-400/60 animate-pulse" />
            )}

            {/* QR Detected badge */}
            {qrDetected && (
              <div className="absolute top-[6%] left-1/2 -translate-x-1/2 bg-emerald-500/90 backdrop-blur-sm text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-10">
                <Focus className="w-3.5 h-3.5" />
                QR Detected
              </div>
            )}

            {/* Hint text at bottom */}
            <div className="absolute bottom-[4%] left-0 right-0 text-center z-10">
              <p className={`text-xs px-4 drop-shadow-lg transition-colors duration-300 ${hintColor}`}>
                {hintText}
              </p>
            </div>
          </div>
        )}

        {/* Torch Button (top-left) */}
        {hasTorch && isActive && cameraReady && (
          <button
            onClick={toggleTorch}
            className="absolute top-3 left-3 z-20 p-2.5 rounded-full transition-all cursor-pointer"
            style={{
              backgroundColor: torchOn ? "rgba(250, 204, 21, 0.9)" : "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
            }}
            title={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
          >
            {torchOn ? (
              <FlashlightOff className="w-5 h-5 text-gray-900" />
            ) : (
              <Flashlight className="w-5 h-5 text-white" />
            )}
          </button>
        )}
      </div>

      {/* Zoom Controls */}
      {hasHardwareZoom && isActive && cameraReady && (
        <div className="mt-3 px-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleZoomChange(zoom - 0.5)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={zoom <= minZoom}
            >
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>

            <div className="flex-1">
              <input
                type="range"
                min={minZoom}
                max={maxZoom}
                step={0.1}
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                style={{
                  background: `linear-gradient(to right, #7c3aed ${((zoom - minZoom) / (maxZoom - minZoom)) * 100}%, #e5e7eb ${((zoom - minZoom) / (maxZoom - minZoom)) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
                <span>{minZoom.toFixed(0)}×</span>
                <span className="font-bold text-purple-600 text-xs">{zoom.toFixed(1)}×</span>
                <span>{maxZoom.toFixed(0)}×</span>
              </div>
            </div>

            <button
              onClick={() => handleZoomChange(zoom + 0.5)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={zoom >= maxZoom}
            >
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* No zoom support message */}
      {!hasHardwareZoom && cameraReady && isActive && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <AlertTriangle className="w-3 h-3" />
          <span>Camera zoom not supported — move closer to the QR code</span>
        </div>
      )}

      {/* Footer */}
      {isActive && cameraReady && (
        <p className="text-[11px] text-gray-400 text-center mt-2">
          {hasHardwareZoom
            ? `${zoom > minZoom ? `Zoomed ${zoom.toFixed(1)}× · ` : ""}Pinch or slider to zoom · Hold steady`
            : "Hold steady for best results"}
        </p>
      )}

      {/* Inline styles for scanning animation */}
      <style>{`
        @keyframes scannerLine {
          0%   { transform: translateY(0);   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(280px); opacity: 0; }
        }
        .animate-scanner-line {
          animation: scannerLine 2.5s ease-in-out infinite;
        }
        /* Range input thumb styling */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: #7c3aed;
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #7c3aed;
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};

// ── Utility ──────────────────────────────────────────────────────────
function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y) || 1;
  return { x: x / len, y: y / len };
}

export default AttendanceScannerV2;
