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
  const tabAwayStartRef = useRef(null);

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
      console.warn('Failed to enter full-screen (requires user click):', error);
      setIsFullScreen(false);
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
      setViolationMessage(`🚨 FINAL WARNING!\n\n${currentCount}${suffix} Violation: ${reason}\n\nYour assessment is being auto-submitted now.`);
      setShowViolationAlert(true);
      
      setTimeout(() => {
        setShowViolationAlert(false);
        if (onAutoSubmitRef.current) {
          onAutoSubmitRef.current(`Multiple Violations (${currentCount} total)`);
        }
      }, 2000);
    } else {
      const remainingViolations = maxViolations - currentCount;
      const remainingText = remainingViolations === 1
        ? "1 more violation will trigger automatic test submission."
        : `${remainingViolations} more violations remaining before auto-submit.`;

      setViolationMessage(`⚠️ PROCTORING WARNING (${currentCount}/${maxViolations})\n\nViolation: ${reason}\n\nPlease stay in full-screen mode!\n\n${remainingText}`);
      setShowViolationAlert(true);
    }
  }, [maxViolations, storageKey]);

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

    // -- Visibility change handler (catches browser tab switches & track duration away) --
    const onVisibilityChange = () => {
      if (document.hidden) {
        tabAwayStartRef.current = Date.now();
        if (!isSubmittingRef.current && !violationInProgressRef.current && !showViolationAlertRef.current) {
          recordViolation('Switched tab/window');
        }
      } else {
        // Returned to tab
        if (tabAwayStartRef.current) {
          const awayDurationSeconds = Math.round((Date.now() - tabAwayStartRef.current) / 1000);
          tabAwayStartRef.current = null;
          
          if (awayDurationSeconds >= 5 && !isSubmittingRef.current && !violationInProgressRef.current) {
            recordViolation(`Stayed away from exam window for ${awayDurationSeconds} seconds`);
          }
        }

        const isCurrentlyFullScreen = !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );
        if (!isCurrentlyFullScreen && !showViolationAlertRef.current) {
          enterFullScreen();
        }
      }
    };

    // -- Window blur handler (catches Alt+Tab, OS taskbar, clicking outside browser) --
    const onWindowBlur = () => {
      if (document.activeElement && document.activeElement.tagName.toLowerCase() === 'iframe') {
        return;
      }

      if (!isSubmittingRef.current && !violationInProgressRef.current && !showViolationAlertRef.current) {
        recordViolation('Switched tab/window');
      }
    };

    // -- Keyboard handler --
    const onKeyDown = (e) => {
      const key = e.key ? e.key.toLowerCase() : '';

      // Intercept ESC
      if (key === 'escape' && !isSubmittingRef.current && !violationInProgressRef.current && !showViolationAlertRef.current) {
        e.preventDefault();
        recordViolation('Exited full-screen mode (ESC key)');
        return;
      }

      // Intercept F-keys (F5, F11, F12)
      if (['f5', 'f11', 'f12'].includes(key)) {
        e.preventDefault();
        recordViolation(`Pressed prohibited key (${e.key})`);
        return;
      }

      // Intercept Ctrl/Cmd shortcut combos (Ctrl+R, Ctrl+Tab, Ctrl+W, DevTools Ctrl+Shift+I, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        if (['r', 'w', 'tab', 'i', 'j', 'u', 's', 'p'].includes(key) || key === 'tab') {
          e.preventDefault();
          recordViolation(`Attempted shortcut key combination (${e.altKey ? 'Alt' : 'Ctrl'}+${e.key ? e.key.toUpperCase() : 'KEY'})`);
        }
      }
    };

    // -- Context menu handler --
    const onContextMenu = (e) => {
      e.preventDefault();
    };

    // -- Before unload handler (warn on page refresh or tab close) --
    const onBeforeUnload = (e) => {
      if (!isSubmittingRef.current && enabled) {
        const message = 'Reloading or leaving this page will disrupt your exam and may record a proctoring violation.';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
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
    window.addEventListener('beforeunload', onBeforeUnload);

    // Initial enter fullscreen attempt on mount
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
      window.removeEventListener('beforeunload', onBeforeUnload);
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
    requestFullScreen: enterFullScreen,
    handleViolationAlertOk,
    setIsSubmitting,
    clearViolations
  };
};