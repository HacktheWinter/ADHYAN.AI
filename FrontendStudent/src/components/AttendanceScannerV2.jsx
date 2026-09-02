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
  GlobalHistogramBinarizer,
  DecodeHintType,
} from "@zxing/library";

// ── Constants ────────────────────────────────────────────────────────
const SCAN_INTERVAL_MS = 150; // ~6.7 FPS — faster for better responsiveness
const AUTO_ZOOM_STEP = 0.15;
const AUTO_ZOOM_TARGET = 2.5;
const QR_SMALL_THRESHOLD = 0.04;
const QR_MEDIUM_THRESHOLD = 0.08;

// Lock-on visual constants
const LOCK_ON_COLOR = "#22c55e"; // green-500
const LOCK_ON_GLOW_COLOR = "rgba(34, 197, 94, 0.35)";
const LOCK_ON_PADDING = 18;
const LOCK_ON_CORNER_LEN = 26;
const LOCK_ON_CORNER_WIDTH = 4;
const LOCK_ON_HOLD_MS = 350; // Keep lock-on visible briefly after QR leaves
const SMOOTH_FACTOR = 0.35; // Lerp factor for smooth corner tracking

const RETICLE_IDLE_COLOR = "#a78bfa"; // purple-400

// Center-crop factor for second detection pass
const CENTER_CROP_FACTOR = 0.55;

// ── Progressive camera constraints ────────────────────────────────
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
    video: { facingMode: "environment" },
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
  const [hintType, setHintType] = useState("idle");

  // ── Refs ───────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const tempCanvasRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const hintsRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const autoZoomRef = useRef(false);
  const zoomRef = useRef(1);
  const isActiveRef = useRef(isActive);
  const mountedRef = useRef(true);
  const lastPinchDistance = useRef(null);
  const hasHardwareZoomRef = useRef(false);
  const maxZoomRef = useRef(1);
  // Lock-on smoothing refs
  const smoothedBoundsRef = useRef(null); // { minX, minY, maxX, maxY }
  const lastDetectionTimeRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { hasHardwareZoomRef.current = hasHardwareZoom; }, [hasHardwareZoom]);
  useEffect(() => { maxZoomRef.current = maxZoom; }, [maxZoom]);

  // ── Initialize ZXing Reader + Decode Hints ─────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    readerRef.current = new QRCodeReader();
    tempCanvasRef.current = document.createElement("canvas");
    cropCanvasRef.current = document.createElement("canvas");

    // TRY_HARDER hint makes ZXing spend more time analyzing each frame
    // → significantly better at detecting small/distant QR codes
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hintsRef.current = hints;

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
          if (err.name === "NotAllowedError" || err.name === "SecurityError") {
            throw err;
          }
          continue;
        }
      }
      throw new Error("No suitable camera found");
    };

    const startCamera = async () => {
      try {
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

        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities?.() || {};

          if (capabilities.zoom) {
            const zMin = capabilities.zoom.min || 1;
            const zMax = Math.min(capabilities.zoom.max || 1, 10);
            setHasHardwareZoom(true);
            setMinZoom(zMin);
            setMaxZoom(zMax);
            setZoom(zMin);
          }

          if (capabilities.torch) {
            setHasTorch(true);
          }

          const advancedConstraints = [];
          if (capabilities.focusMode?.includes("continuous")) {
            advancedConstraints.push({ focusMode: "continuous" });
          }
          if (capabilities.whiteBalanceMode?.includes("continuous")) {
            advancedConstraints.push({ whiteBalanceMode: "continuous" });
          }
          if (capabilities.exposureMode?.includes("continuous")) {
            advancedConstraints.push({ exposureMode: "continuous" });
          }

          if (advancedConstraints.length > 0) {
            try {
              await track.applyConstraints({ advanced: advancedConstraints });
            } catch { /* OK */ }
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
          setCameraError("Camera access was denied. Please allow camera permission in your browser settings and try again.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("No camera found on this device. Please connect a camera and try again.");
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setCameraError("Your camera is being used by another app. Please close other apps using the camera and try again.");
        } else if (err.name === "OverconstrainedError") {
          setCameraError("We couldn't access your camera with the required settings. Please try a different browser.");
        } else {
          setCameraError("We couldn't access your camera. Please check your permissions and try again.");
        }
      }
    };

    startCamera();

    return () => {
      localMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      setCameraReady(false);
      setTorchOn(false);
    };
  }, [isActive]);

  // ── Apply Hardware Zoom ────────────────────────────────────────────
  const applyHardwareZoom = useCallback(async (level) => {
    if (!hasHardwareZoomRef.current || !streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: Math.min(level, maxZoomRef.current) }] });
    } catch { /* OK */ }
  }, []);

  // ── Torch Toggle ───────────────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const newState = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: newState }] });
      setTorchOn(newState);
    } catch { /* OK */ }
  }, [torchOn]);

  // ══════════════════════════════════════════════════════════════════
  // Google Lens-style Lock-On Drawing
  // ══════════════════════════════════════════════════════════════════

  const drawLockOn = useCallback((rawBounds) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const dw = canvas.clientWidth;
    const dh = canvas.clientHeight;
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext("2d");

    // Smooth the bounds (lerp toward new position to prevent jitter)
    let bounds;
    if (smoothedBoundsRef.current) {
      const s = smoothedBoundsRef.current;
      const f = SMOOTH_FACTOR;
      bounds = {
        minX: s.minX + (rawBounds.minX - s.minX) * f,
        minY: s.minY + (rawBounds.minY - s.minY) * f,
        maxX: s.maxX + (rawBounds.maxX - s.maxX) * f,
        maxY: s.maxY + (rawBounds.maxY - s.maxY) * f,
      };
    } else {
      bounds = { ...rawBounds };
    }
    smoothedBoundsRef.current = bounds;

    const { minX, minY, maxX, maxY } = bounds;
    const pad = LOCK_ON_PADDING;
    const x1 = minX - pad;
    const y1 = minY - pad;
    const x2 = maxX + pad;
    const y2 = maxY + pad;
    const rr = 10; // rounded corner radius

    // ── 1. Dark vignette overlay with cutout ──
    ctx.clearRect(0, 0, dw, dh);
    ctx.save();

    // Create clip path: full canvas MINUS the QR area (even-odd)
    ctx.beginPath();
    ctx.rect(0, 0, dw, dh);
    // Counter-clockwise inner rect (creates the hole)
    roundRectPath(ctx, x1, y1, x2 - x1, y2 - y1, rr, true);
    ctx.clip("evenodd");

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, dw, dh);
    ctx.restore();

    // ── 2. Subtle border around cutout ──
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRectPath(ctx, x1, y1, x2 - x1, y2 - y1, rr);
    ctx.stroke();

    // ── 3. Green glow ──
    ctx.save();
    ctx.shadowColor = LOCK_ON_COLOR;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = LOCK_ON_GLOW_COLOR;
    ctx.lineWidth = 3;
    ctx.beginPath();
    roundRectPath(ctx, x1, y1, x2 - x1, y2 - y1, rr);
    ctx.stroke();
    ctx.restore();

    // ── 4. Corner brackets (the signature Google Lens look) ──
    const cLen = LOCK_ON_CORNER_LEN;
    const cW = LOCK_ON_CORNER_WIDTH;
    ctx.strokeStyle = LOCK_ON_COLOR;
    ctx.lineWidth = cW;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x1, y1 + cLen);
    ctx.lineTo(x1, y1 + rr);
    ctx.arcTo(x1, y1, x1 + rr, y1, rr);
    ctx.lineTo(x1 + cLen, y1);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x2 - cLen, y1);
    ctx.lineTo(x2 - rr, y1);
    ctx.arcTo(x2, y1, x2, y1 + rr, rr);
    ctx.lineTo(x2, y1 + cLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x1, y2 - cLen);
    ctx.lineTo(x1, y2 - rr);
    ctx.arcTo(x1, y2, x1 + rr, y2, rr);
    ctx.lineTo(x1 + cLen, y2);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x2 - cLen, y2);
    ctx.lineTo(x2 - rr, y2);
    ctx.arcTo(x2, y2, x2, y2 - rr, rr);
    ctx.lineTo(x2, y2 - cLen);
    ctx.stroke();

    // ── 5. Dot markers at exact QR corners ──
    ctx.fillStyle = LOCK_ON_COLOR;
    const dotR = 3.5;
    [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    smoothedBoundsRef.current = null;
  }, []);

  // ── Auto Zoom Logic ────────────────────────────────────────────────
  const handleAutoZoom = useCallback(
    (qrAreaFraction) => {
      if (autoZoomRef.current) return;
      if (!hasHardwareZoomRef.current) return;

      if (qrAreaFraction < QR_SMALL_THRESHOLD && zoomRef.current < AUTO_ZOOM_TARGET) {
        autoZoomRef.current = true;
        setHintText("QR detected — zooming in...");
        setHintType("detected");

        const zoomStep = () => {
          if (!autoZoomRef.current || !mountedRef.current) return;
          const cur = zoomRef.current;
          const target = Math.min(AUTO_ZOOM_TARGET, maxZoomRef.current);
          if (cur >= target) { autoZoomRef.current = false; return; }
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

  // ── Determine hint ─────────────────────────────────────────────────
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
      setHintText("QR locked — hold steady...");
      setHintType("zoomHint");
    } else {
      setHintText("QR Locked! Processing...");
      setHintType("detected");
    }
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // Multi-Pass QR Detection (improved quality)
  // ══════════════════════════════════════════════════════════════════
  //
  // Pass 1: Full frame + HybridBinarizer + TRY_HARDER
  // Pass 2: Full frame + GlobalHistogramBinarizer + TRY_HARDER
  // Pass 3: Center-crop (55%) + HybridBinarizer + TRY_HARDER
  //         (the crop makes distant QR take up a larger fraction,
  //          which helps the binarizer threshold it correctly)

  const tryDecode = useCallback((canvas, reader, hints) => {
    const luminance = new HTMLCanvasElementLuminanceSource(canvas);

    // Pass 1: HybridBinarizer (best for most cases)
    try {
      const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
      return reader.decode(bitmap, hints);
    } catch { /* continue */ }

    // Pass 2: GlobalHistogramBinarizer (better for uneven lighting)
    try {
      const luminance2 = new HTMLCanvasElementLuminanceSource(canvas);
      const bitmap2 = new BinaryBitmap(new GlobalHistogramBinarizer(luminance2));
      return reader.decode(bitmap2, hints);
    } catch { /* continue */ }

    return null;
  }, []);

  // ── Continuous Scanning Loop ───────────────────────────────────────
  useEffect(() => {
    if (!cameraReady || !isActive) return;

    const scan = () => {
      if (!isActiveRef.current) return;

      const video = videoRef.current;
      const reader = readerRef.current;
      const tempCanvas = tempCanvasRef.current;
      const cropCanvas = cropCanvasRef.current;
      const hints = hintsRef.current;
      if (!video || !reader || !tempCanvas || !cropCanvas || video.readyState < 2) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      // Draw full frame to temp canvas
      tempCanvas.width = vw;
      tempCanvas.height = vh;
      const ctx = tempCanvas.getContext("2d");
      ctx.drawImage(video, 0, 0, vw, vh);

      // ── Try full-frame detection (Pass 1 & 2) ──
      let result = tryDecode(tempCanvas, reader, hints);

      // ── If full-frame fails, try center-crop (Pass 3) ──
      // Cropping the center means the QR code occupies a larger
      // fraction of the image → better binarization for distant codes
      let cropOffsetX = 0;
      let cropOffsetY = 0;
      if (!result) {
        const cropW = Math.round(vw * CENTER_CROP_FACTOR);
        const cropH = Math.round(vh * CENTER_CROP_FACTOR);
        cropOffsetX = Math.round((vw - cropW) / 2);
        cropOffsetY = Math.round((vh - cropH) / 2);

        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext("2d");
        cropCtx.drawImage(video, cropOffsetX, cropOffsetY, cropW, cropH, 0, 0, cropW, cropH);

        result = tryDecode(cropCanvas, reader, hints);
      }

      if (result) {
        const points = result.getResultPoints();
        lastDetectionTimeRef.current = Date.now();
        setQrDetected(true);

        if (points && points.length >= 3) {
          // Map points back to full-frame coordinates (accounting for crop offset)
          const displayW = canvasRef.current?.clientWidth || 1;
          const displayH = canvasRef.current?.clientHeight || 1;
          const scaleX = displayW / vw;
          const scaleY = displayH / vh;

          const xs = points.map((p) => (p.getX() + cropOffsetX));
          const ys = points.map((p) => (p.getY() + cropOffsetY));
          const qrW = Math.max(...xs) - Math.min(...xs);
          const qrH = Math.max(...ys) - Math.min(...ys);
          const fraction = (qrW * qrH) / (vw * vh);

          updateHint(fraction, true);
          handleAutoZoom(fraction);

          // Draw Google Lens lock-on with display-scaled coordinates
          drawLockOn({
            minX: Math.min(...xs) * scaleX,
            minY: Math.min(...ys) * scaleY,
            maxX: Math.max(...xs) * scaleX,
            maxY: Math.max(...ys) * scaleY,
          });
        } else {
          setHintText("QR Locked! Processing...");
          setHintType("detected");
        }

        // Emit scan result
        const rawValue = result.getText();
        if (rawValue && onScan) {
          onScan([{ rawValue }]);
        }
      } else {
        // No QR found — check hold time before clearing lock-on
        const elapsed = Date.now() - lastDetectionTimeRef.current;
        if (elapsed > LOCK_ON_HOLD_MS) {
          setQrDetected(false);
          updateHint(0, false);
          clearCanvas();
        }
        // else: keep showing last lock-on position (reduces flicker)
      }
    };

    scanIntervalRef.current = setInterval(scan, SCAN_INTERVAL_MS);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [cameraReady, isActive, drawLockOn, clearCanvas, handleAutoZoom, updateHint, tryDecode, onScan]);

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

  // ── Hint color ─────────────────────────────────────────────────────
  const hintColor =
    hintType === "detected"
      ? "text-emerald-400 font-semibold"
      : hintType === "tooSmall" || hintType === "noZoom"
      ? "text-amber-400 font-medium"
      : hintType === "zoomHint"
      ? "text-emerald-300 font-medium"
      : "text-white/70";

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════

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

        {/* Canvas overlay — handles BOTH the lock-on AND idle vignette */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
        />

        {/* Loading state */}
        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-900">
            <Camera className="w-10 h-10 text-purple-400 animate-pulse mb-3" />
            <p className="text-white/70 text-sm font-medium">Starting camera...</p>
          </div>
        )}

        {/* ── Idle Reticle (only when QR is NOT detected) ── */}
        {isActive && cameraReady && !qrDetected && (
          <div className="absolute inset-0 pointer-events-none z-[6]">
            {/* Dark overlay with centered cutout */}
            <div className="absolute inset-0 bg-black/30" />
            <div
              className="absolute left-[10%] right-[10%] top-[10%] bottom-[10%] bg-transparent"
              style={{
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                borderRadius: "12px",
              }}
            />

            {/* Static corner brackets (purple) */}
            <div className="absolute left-[10%] right-[10%] top-[10%] bottom-[10%]">
              <div className="absolute top-0 left-0 w-8 h-8" style={{ borderTop: `3.5px solid ${RETICLE_IDLE_COLOR}`, borderLeft: `3.5px solid ${RETICLE_IDLE_COLOR}`, borderTopLeftRadius: "8px" }} />
              <div className="absolute top-0 right-0 w-8 h-8" style={{ borderTop: `3.5px solid ${RETICLE_IDLE_COLOR}`, borderRight: `3.5px solid ${RETICLE_IDLE_COLOR}`, borderTopRightRadius: "8px" }} />
              <div className="absolute bottom-0 left-0 w-8 h-8" style={{ borderBottom: `3.5px solid ${RETICLE_IDLE_COLOR}`, borderLeft: `3.5px solid ${RETICLE_IDLE_COLOR}`, borderBottomLeftRadius: "8px" }} />
              <div className="absolute bottom-0 right-0 w-8 h-8" style={{ borderBottom: `3.5px solid ${RETICLE_IDLE_COLOR}`, borderRight: `3.5px solid ${RETICLE_IDLE_COLOR}`, borderBottomRightRadius: "8px" }} />
            </div>

            {/* Scanning line animation */}
            <div className="absolute left-[10%] right-[10%] top-[10%] bottom-[10%] overflow-hidden rounded-xl">
              <div
                className="w-full h-0.5 animate-scanner-line"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${RETICLE_IDLE_COLOR} 50%, transparent 100%)`,
                }}
              />
            </div>
          </div>
        )}

        {/* ── QR Detected badge (shows during lock-on) ── */}
        {isActive && cameraReady && qrDetected && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald-500/90 backdrop-blur-sm text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-10 animate-pulse">
            <Focus className="w-3.5 h-3.5" />
            QR Locked
          </div>
        )}

        {/* Hint text at bottom */}
        {isActive && cameraReady && (
          <div className="absolute bottom-3 left-0 right-0 text-center z-10">
            <p className={`text-xs px-4 drop-shadow-lg transition-colors duration-300 ${hintColor}`}>
              {hintText}
            </p>
          </div>
        )}

        {/* Torch Button */}
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

      {/* Styles */}
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

// ── Utilities ────────────────────────────────────────────────────────

/** Draw a rounded rect path (counter-clockwise if `ccw` is true, for clip cutouts) */
function roundRectPath(ctx, x, y, w, h, r, ccw = false) {
  if (ccw) {
    // Counter-clockwise for even-odd clip cutout
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

export default AttendanceScannerV2;
