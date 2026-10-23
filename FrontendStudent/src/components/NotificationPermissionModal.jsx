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
    if (!isNotificationSupported()) return;

    const currentPerm = getNotificationPermission();
    if (currentPerm !== "default") return;

    const user = getStoredUser();
    if (!user) return;

    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

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
    const snoozeTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, snoozeTime.toString());
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative mx-auto my-auto"
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Body */}
            <div className="p-6 text-center">
              {/* App Icon */}
              <div className="relative mx-auto mb-3.5 w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden">
                  <img
                    src="/logo02.png"
                    alt="ADHYAN.AI Logo"
                    className="w-9 h-9 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-1 rounded-full shadow-xs">
                  <Bell className="w-3 h-3" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-1.5">
                Allow notifications?
              </h3>

              {/* Subtitle */}
              <p className="text-xs text-gray-600 leading-relaxed mb-4 px-1">
                Get reminders for live classes, upcoming quizzes, test results, and notices directly in your phone's notification drawer.
              </p>

              {/* Highlights */}
              <div className="flex flex-col gap-2 mb-5 bg-purple-50/70 p-3 rounded-xl border border-purple-100 text-left">
                <div className="flex items-center gap-2 text-xs text-purple-950 font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>Notification Shade & Lock screen alerts</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-purple-950 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>Never miss class schedules & quiz starts</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-xl font-semibold text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors cursor-pointer"
                >
                  Don't allow
                </button>
                <button
                  type="button"
                  onClick={handleAllow}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-xl font-semibold text-xs text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 shadow-md shadow-purple-700/25 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {loading ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Allow"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
