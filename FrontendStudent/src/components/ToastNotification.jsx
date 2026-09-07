import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, Info, X } from 'lucide-react';

const typeConfig = {
  success: {
    Icon: Check,
    iconBg: '#6D28D9',
    iconColor: '#FFFFFF',
  },
  error: {
    Icon: X,
    iconBg: '#EF4444',
    iconColor: '#FFFFFF',
  },
  info: {
    Icon: Info,
    iconBg: '#3B82F6',
    iconColor: '#FFFFFF',
  },
};

const ToastNotification = ({ message, type = 'success', onClose, duration = 4000 }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!message) {
      setIsExiting(false);
      return;
    }
    setIsExiting(false);

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose?.(), 280);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const config = typeConfig[type] || typeConfig.info;
  const { Icon, iconBg, iconColor } = config;

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto flex justify-center"
          style={{ width: 'max-content', maxWidth: '90vw' }}
        >
          <div
            className="toast-card flex items-center gap-3 bg-white dark:bg-surface border border-line rounded-full shadow-lg px-4 py-3"
            style={{ 
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' 
            }}
          >
            {/* Icon Circle */}
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: iconBg }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: iconColor, strokeWidth: 3 }} />
            </div>

            {/* Text */}
            <p className="text-sm font-semibold font-body text-ink toast-text whitespace-nowrap pr-2">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ToastNotification;
