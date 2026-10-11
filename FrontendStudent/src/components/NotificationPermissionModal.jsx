import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Smartphone, X, ShieldCheck } from "lucide-react";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
} from "../utils/notificationService";
import { getStoredUser } from "../utils/authStorage";

const DISMISSED_KEY = "adhyan_notif_permission_dismissed_until";

export default function NotificationPermissionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only check if notifications are supported and permission has not yet been decided ('default')
    if (!isNotificationSupported()) return;

    const currentPerm = getNotificationPermission();
    if (currentPerm !== "default") return;

    // Only prompt for logged-in students
    const user = getStoredUser();
    if (!user) return;

    // Check if dismissed recently (e.g., within 5 days)
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // Show after a brief delay (1.2 seconds) like a native Android app opening
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    setLoading(true);
    try {
      const perm = await requestNotificationPermission();
      if (perm === "granted") {
        // Send instant test notification to show it working in the shade
        await sendTestNotification();
      }
    } catch (err) {
      console.error("Error allowing notifications:", err);
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  const handleDismiss = () => {
    // Snooze for 5 days so we don't nag the student on every page reload
    const snoozeTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, snoozeTime.toString());
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative"
        >
          {/* Subtle Top Close Button */}
          <button
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Android-style Dialog Header & Content */}
          <div className="p-6 sm:p-7 text-center">
            {/* App Icon / Badge */}
            <div className="relative mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-500 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden">
                <img
                  src="/logo02.png"
                  alt="ADHYAN.AI Logo"
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    // Fallback to Bell icon if image not available
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-1 rounded-full shadow-xs">
                <Bell className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight mb-2">
              Allow ADHYAN.AI to send you notifications?
            </h3>

            {/* Subtitle / Description */}
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-sm mx-auto mb-5">
              Get instant alerts in your device's <strong>Notification Shade</strong> and lock screen for live classes, upcoming quizzes, test results, and teacher notices.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-col gap-2 mb-6 bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100/70 text-left">
              <div className="flex items-center gap-2.5 text-xs text-purple-900 font-medium">
                <Smartphone className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Pulls down directly in your phone's notification tray</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-purple-900 font-medium">
                <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Never miss exam start times & submission deadlines</span>
              </div>
            </div>

            {/* Android-style Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDismiss}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors cursor-pointer"
              >
                Don't allow
              </button>
              <button
                type="button"
                onClick={handleAllow}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 shadow-md shadow-purple-700/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Allow"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
