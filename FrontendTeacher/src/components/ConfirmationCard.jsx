import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Archive, AlertTriangle, Info, X, Loader } from 'lucide-react';

const typeConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    confirmBg: 'bg-rose-600 hover:bg-rose-700',
    accentBorder: 'border-rose-200',
    darkClass: 'dark-confirm-danger',
  },
  warning: {
    icon: Archive,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBg: 'bg-amber-600 hover:bg-amber-700',
    accentBorder: 'border-amber-200',
    darkClass: 'dark-confirm-warning',
  },
  info: {
    icon: Info,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    confirmBg: 'bg-violet-600 hover:bg-violet-700',
    accentBorder: 'border-violet-200',
    darkClass: 'dark-confirm-info',
  },
};

const ConfirmationCard = ({
  isOpen,
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger',
  isLoading = false,
}) => {
  const config = typeConfig[type] || typeConfig.danger;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-150"
          onClick={onCancel}
        >
          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`confirm-card relative bg-surface border border-line rounded-2xl shadow-2xl max-w-md w-[90%] mx-4 overflow-hidden ${config.darkClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent line */}
            <div className={`h-1 w-full ${config.confirmBg.split(' ')[0]}`} />

            {/* Close button */}
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-soft hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Body */}
            <div className="px-6 pt-6 pb-5">
              {/* Icon circle */}
              <div className={`w-12 h-12 rounded-full ${config.iconBg} confirm-icon-bg flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${config.iconColor} confirm-icon-color`} />
              </div>

              {/* Title */}
              <h3 className="font-display text-xl font-semibold text-ink mb-2 tracking-tight">
                {title}
              </h3>

              {/* Message */}
              <p className="text-sm text-ink-soft leading-relaxed font-body">
                {message}
              </p>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-3 px-6 py-4 bg-paper border-t border-line confirm-footer">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-surface hover:bg-violet-50 border border-line rounded-xl text-sm font-bold text-ink transition-all cursor-pointer confirm-cancel-btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 ${config.confirmBg} rounded-xl text-sm font-bold text-white transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading && <Loader className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Processing...' : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationCard;
