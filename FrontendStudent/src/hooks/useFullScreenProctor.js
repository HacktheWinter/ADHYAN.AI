// FrontendStudent/src/hooks/useFullScreenProctor.js
import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for full-screen proctoring with anti-cheat features
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Enable/disable proctoring
 * @param {Function} options.onViolation - Callback when violation occurs
 * @param {Function} options.onAutoSubmit - Callback for auto-submit
 * @param {number} options.maxViolations - Maximum violations before auto-submit (default: 2)
 * @returns {Object} - Proctoring state and handlers
 */
export const useFullScreenProctor = ({
  enabled = true,
  onViolation,
  onAutoSubmit,
  maxViolations = 2
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showViolationAlert, setShowViolationAlert] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  
  const violationInProgressRef = useRef(false);
  const lastViolationTimeRef = useRef(0);
  const violationsRef = useRef([]);
  const isSubmittingRef = useRef(false);

  // ==================== FULL-SCREEN FUNCTIONS ====================
  const enterFullScreen = async () => {
    if (!enabled) return;
    
    try {
      const element = document.documentElement;
      
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
      
      setIsFullScreen(true);
    } catch (error) {
      console.error('Failed to enter full-screen:', error);
    }
  };

  const exitFullScreen = () => {
    if (!enabled) return;
    
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } catch (error) {
      console.error('Failed to exit full-screen:', error);
    }
  };

  // ==================== VIOLATION HANDLERS ====================
  const handleFullScreenChange = () => {
    const isCurrentlyFullScreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    setIsFullScreen(isCurrentlyFullScreen);

    if (!isCurrentlyFullScreen && !isSubmittingRef.current && !violationInProgressRef.current && !showViolationAlert) {
      recordViolation('Exited full-screen mode');
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden && !isSubmittingRef.current && !violationInProgressRef.current && !showViolationAlert) {
      recordViolation('Switched tab/window');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !isSubmittingRef.current && !violationInProgressRef.current && !showViolationAlert) {
      e.preventDefault();
      recordViolation('Pressed ESC key');
    }
    
    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'p'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  // ==================== VIOLATION RECORDING ====================
  const recordViolation = (reason) => {
    const now = Date.now();
    if (now - lastViolationTimeRef.current < 2000) {
      return;
    }

    if (violationInProgressRef.current) {
      return;
    }

    violationInProgressRef.current = true;
    lastViolationTimeRef.current = now;

    const newViolation = {
      timestamp: new Date().toISOString(),
      reason
    };

    violationsRef.current.push(newViolation);
    const currentCount = violationsRef.current.length;
    
    // Call onViolation callback
    if (onViolation) {
      onViolation(newViolation, currentCount);
    }

    if (currentCount >= maxViolations) {
      setViolationMessage(`🚨 FINAL WARNING!\n\n${currentCount}${currentCount === 2 ? 'nd' : 'th'} Violation: ${reason}\n\nYour assessment will be auto-submitted now.`);
      setShowViolationAlert(true);
      
      setTimeout(() => {
        setShowViolationAlert(false);
        if (onAutoSubmit) {
          onAutoSubmit(`Multiple Violations (${currentCount} total)`);
        }
      }, 2000);
    } else {
      setViolationMessage(`⚠️ WARNING ${currentCount}/${maxViolations}\n\nViolation: ${reason}\n\nPlease stay in full-screen mode!\n\nOne more violation = auto-submit.`);
      setShowViolationAlert(true);
    }
  };

  const handleViolationAlertOk = () => {
    setShowViolationAlert(false);
    violationInProgressRef.current = false;
    
    setTimeout(() => {
      enterFullScreen();
    }, 100);
  };

  // ==================== SETUP/CLEANUP ====================
  const setupListeners = () => {
    if (!enabled) return;

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('MSFullscreenChange', handleFullScreenChange);
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
  };

  const cleanupListeners = () => {
    document.removeEventListener('fullscreenchange', handleFullScreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
    document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('contextmenu', handleContextMenu);
  };

  useEffect(() => {
    if (enabled) {
      enterFullScreen();
      setupListeners();
    }
    
    return () => {
      cleanupListeners();
      exitFullScreen();
    };
  }, [enabled]);

  // ==================== UPDATE SUBMITTING STATE ====================
  const setIsSubmitting = (value) => {
    isSubmittingRef.current = value;
  };

  return {
    isFullScreen,
    showViolationAlert,
    violationMessage,
    violations: violationsRef.current,
    enterFullScreen,
    exitFullScreen,
    handleViolationAlertOk,
    setIsSubmitting
  };
};