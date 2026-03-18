import React, { useRef, useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  X, 
  Maximize, 
  Minimize,
  SkipForward,
  SkipBack,
  Settings,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";

const VideoWatch = ({ videoUrl, title = "Video", topic, description, onClose }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // Update time & duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    const newTime = Number(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolume = (e) => {
    const video = videoRef.current;
    const newVol = Number(e.target.value);
    video.volume = newVol;
    setVolume(newVol);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    const newVol = volume > 0 ? 0 : 1;
    setVolume(newVol);
    if (video) video.volume = newVol;
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + seconds), duration);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const changePlaybackRate = (rate) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return "0:00";
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleVideoClick = () => {
    togglePlay();
    resetControlsTimeout();
  };

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className={`relative flex flex-col bg-black rounded-xl overflow-hidden shadow-2xl ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-5xl'
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
      >
        {/* Close Button - Only visible when controls are shown */}
        {showControls && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-all backdrop-blur-sm cursor-pointer"
          >
            <X size={24} />
          </motion.button>
        )}

        {/* Video Container */}
        <div className="flex-1 relative flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain cursor-pointer"
            onClick={handleVideoClick}
          />

          {/* Center Play Button (when paused) */}
          {!isPlaying && showControls && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-all cursor-pointer"
            >
              <Play fill="white" size={36} className="text-white translate-x-1" />
            </motion.button>
          )}
        </div>

        {/* Bottom Controls */}
        {showControls && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent"
          >
            {/* Progress Bar */}
            <div className="px-6 pt-4">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`
                }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between px-6 py-4">
              {/* Left Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-2 rounded-lg hover:bg-white/10 text-white transition-all cursor-pointer"
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>

                <button
                  onClick={() => skip(-10)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white transition-all cursor-pointer"
                >
                  <SkipBack size={20} />
                </button>

                <button
                  onClick={() => skip(10)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white transition-all cursor-pointer"
                >
                  <SkipForward size={20} />
                </button>

                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-lg hover:bg-white/10 text-white transition-all cursor-pointer"
                  >
                    {volume > 0 ? <Volume2 size={20} /> : <VolumeX size={20} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={handleVolume}
                    className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #fff 0%, #fff ${volume * 100}%, #4b5563 ${volume * 100}%, #4b5563 100%)`
                    }}
                  />
                </div>

                <span className="text-white text-sm font-medium ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2 relative">
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 rounded-lg hover:bg-white/10 text-white transition-all cursor-pointer"
                  >
                    <Settings size={20} />
                  </button>

                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-gray-700">
                        <p className="text-xs text-gray-400 font-semibold px-2">Playback Speed</p>
                      </div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-all ${
                            playbackRate === rate ? "text-indigo-400 font-bold" : "text-white"
                          }`}
                        >
                          {rate}x {playbackRate === rate && "✓"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg hover:bg-white/10 text-white transition-all cursor-pointer"
                >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </motion.div>
  );
};

export default VideoWatch;