import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Full-width webcam warning alert banner shown at the top of the screen.
 * Prominent red design with pulsing icon to grab the student's attention.
 */
export default function WebcamStatusToast({ show, message, onDismiss }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-[200] pointer-events-none"
        >
          <div className="pointer-events-auto mx-auto max-w-3xl mt-4 px-4">
            <div
              style={{
                background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #b91c1c 100%)',
                boxShadow: '0 8px 32px rgba(220, 38, 38, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
              }}
              className="rounded-2xl p-4 sm:p-5 flex items-center gap-4"
            >
              {/* Pulsing red icon */}
              <div className="flex-shrink-0 relative">
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: 'rgba(255, 100, 100, 0.4)' }}
                />
                <div
                  className="relative w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Message content */}
              <div className="flex-1 min-w-0">
                <h4
                  className="text-sm font-bold uppercase tracking-widest mb-0.5"
                  style={{ color: 'rgba(255, 200, 200, 0.9)' }}
                >
                  ⚠ Proctoring Warning
                </h4>
                <p className="text-white text-sm sm:text-base font-semibold leading-snug">
                  {message?.replace(/^⚠️\s*/, '')}
                </p>
              </div>

              {/* Dismiss button */}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="flex-shrink-0 p-2 rounded-full transition-colors cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
                  aria-label="Dismiss warning"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
