// FrontendStudent/src/hooks/useFullScreenProctor.js
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for full-screen proctoring with anti-cheat features
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Enable/disable proctoring
 * @param {Function} options.onViolation - Callback when violation occurs
 * @param {Function} options.onAutoSubmit - Callback for auto-submit
 * @param {number} options.maxViolations - Maximum violations before auto-submit (default: 4)
 * @returns {Object} - Proctoring state and handlers
 */
export const useFullScreenProctor = ({
  enabled = true,
  onViolation,
  onAutoSubmit,
  maxViolations = 4,
  examId = 'default'
}) => {
  const storageKey = `proctor_violations_${examId}`;
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showViolationAlert, setShowViolationAlert] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  
  const violationInProgressRef = useRef(false);
  const lastViolationTimeRef = useRef(0);
  const violationsRef = useRef(JSON.parse(localStorage.getItem(storageKey) || '[]'));
  const isSubmittingRef = useRef(false);
  const showViolationAlertRef = useRef(false);

  // Keep the ref in sync with state so event handlers always see latest value
  useEffect(() => {
    showViolationAlertRef.current = showViolationAlert;
  }, [showViolationAlert]);

  // Store callbacks in refs to avoid stale closures
  const onViolationRef = useRef(onViolation);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
  useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);

  // ==================== FULL-SCREEN FUNCTIONS ====================
  const enterFullScreen = useCallback(async () => {
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
  }, [enabled]);

  const exitFullScreen = useCallback(() => {
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
  }, [enabled]);

  // ==================== VIOLATION RECORDING ====================
  const recordViolation = useCallback((reason) => {
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
    localStorage.setItem(storageKey, JSON.stringify(violationsRef.current));
    
    const currentCount = violationsRef.current.length;
    
    // Call onViolation callback
    if (onViolationRef.current) {
      onViolationRef.current(newViolation, currentCount);
    }

    if (currentCount >= maxViolations) {
      const suffix = currentCount === 1 ? 'st' : currentCount === 2 ? 'nd' : currentCount === 3 ? 'rd' : 'th';
      setViolationMessage(` FINAL WARNING!\n\n${currentCount}${suffix} Violation: ${reason}\n\nYour assessment will be auto-submitted now.`);
      setShowViolationAlert(true);
      
      setTimeout(() => {
        setShowViolationAlert(false);
        if (onAutoSubmitRef.current) {
          onAutoSubmitRef.current(`Multiple Violations (${currentCount} total)`);
        }
      }, 2000);
    } else {
      setViolationMessage(` WARNING ${currentCount}/${maxViolations}\n\nViolation: ${reason}\n\nPlease stay in full-screen mode!\n\nOne more violation = auto-submit.`);
      setShowViolationAlert(true);
    }
  }, [maxViolations]);

  const handleViolationAlertOk = useCallback(() => {
    setShowViolationAlert(false);
    violationInProgressRef.current = false;
    
    setTimeout(() => {
      enterFullScreen();
    }, 100);
  }, [enterFullScreen]);

  // ==================== SETUP/CLEANUP ====================
  useEffect(() => {
    if (!enabled) return;

    // -- Fullscreen change handler --
    const onFullScreenChange = () => {
      const isCurrentlyFullScreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      setIsFullScreen(isCurrentlyFullScreen);

      if (!isCurrentlyFullScreen && !isSubmittingRef.current && !violationInProgressRef.current && !showViolationAlertRef.current) {
        recordViolation('Exited full-screen mode');
      }
    };

    // -- Visibility change handler (catches browser tab switches) --
    const onVisibilityChange = () => {
      if (document.hidden && !isSubmittingRef.current && !violationInProgressRef.current && !showViolationAlertRef.current) {
        recordViolation('Switched tab/window');
      }
    };

    // -- Window blur handler (catches Alt+Tab, clicking other apps, taskbar, etc.) --
    const onWindowBlur = () => {
      // document.hidden may not be true yet when Alt+Tabbing, so use blur as a catch-all
      if (!isSubmittingRef.current && !violationInProgressRef.current && !showViolationAlertRef.current) {
        recordViolation('Switched tab/window');
      }
    };

    // -- Keyboard handler --
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmittingRef.current && !violationInProgressRef.current && !showViolationAlertRef.current) {
        e.preventDefault();
        recordViolation('Pressed ESC key');
      }
      
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    // -- Context menu handler --
    const onContextMenu = (e) => {
      e.preventDefault();
    };

    // Register all listeners
    document.addEventListener('fullscreenchange', onFullScreenChange);
    document.addEventListener('webkitfullscreenchange', onFullScreenChange);
    document.addEventListener('mozfullscreenchange', onFullScreenChange);
    document.addEventListener('MSFullscreenChange', onFullScreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', onWindowBlur);

    // Enter fullscreen on mount
    enterFullScreen();

    return () => {
      document.removeEventListener('fullscreenchange', onFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullScreenChange);
      document.removeEventListener('mozfullscreenchange', onFullScreenChange);
      document.removeEventListener('MSFullscreenChange', onFullScreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', onWindowBlur);
      exitFullScreen();
    };
  }, [enabled, recordViolation, enterFullScreen, exitFullScreen]);

  // ==================== UPDATE SUBMITTING STATE ====================
  const setIsSubmitting = (value) => {
    isSubmittingRef.current = value;
  };

  const clearViolations = () => {
    violationsRef.current = [];
    localStorage.removeItem(storageKey);
  };

  return {
    isFullScreen,
    showViolationAlert,
    violationMessage,
    violations: violationsRef.current,
    enterFullScreen,
    exitFullScreen,
    handleViolationAlertOk,
    setIsSubmitting,
    clearViolations
  };
};