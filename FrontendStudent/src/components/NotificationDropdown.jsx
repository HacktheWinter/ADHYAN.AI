import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import { Bell, Clock, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [readNotifications, setReadNotifications] = useState({});
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const studentId = user.id || user._id;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load read notifications from localStorage once
  useEffect(() => {
    const stored = localStorage.getItem(`read_notifications_${studentId}`);
    let parsed = {};

    try {
      const raw = JSON.parse(stored || "{}");
      if (Array.isArray(raw)) {
        raw.forEach((id) => {
          parsed[id] = 0;
        });
      } else {
        parsed = raw;
      }
    } catch (e) {
      parsed = {};
    }

    setReadNotifications(parsed);
  }, [studentId]);

  // Initial fetch for badge count
  useEffect(() => {
    if (studentId) fetchNotifications();
  }, [studentId]);

  useEffect(() => {
    if (!studentId || !isOpen) return;
    fetchNotifications();
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const results = await Promise.allSettled([
        axios.get(
          `${API_BASE_URL}/calendar/student/all/${studentId}`
        ),
        axios.get(
          `${API_BASE_URL}/announcement/student/${studentId}`
        ),
      ]);

      let allNotifications = [];
      const [calendarResult, announcementResult] = results;

      if (
        calendarResult.status === "fulfilled" &&
        calendarResult.value.data.success
      ) {
        const eventNotifs = generateNotifications(
          calendarResult.value.data.events
        );
        allNotifications = [...allNotifications, ...eventNotifs];
      } else if (calendarResult.status === "rejected") {
        console.warn("Failed to fetch calendar events:", calendarResult.reason);
      }

      if (
        announcementResult.status === "fulfilled" &&
        (announcementResult.value.data.success ||
          Array.isArray(announcementResult.value.data.announcements))
      ) {
        const announcements = announcementResult.value.data.announcements || [];

        const announcementNotifs = announcements.map((ann) => {
          const className = ann.classroomId?.name || "Class";
          const title = "New Announcement";

          return {
            id: `ann-${ann._id}`,
            title: title,
            message: ann.message || ann.title || "Check for details",
            className: className,
            type: "info",
            time: new Date(ann.createdAt),
            icon: <AlertCircle className="w-4 h-4 text-blue-500" />,
          };
        });

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentAnnouncements = announcementNotifs.filter(
          (n) => n.time > sevenDaysAgo
        );
        allNotifications = [...allNotifications, ...recentAnnouncements];
      } else if (announcementResult.status === "rejected") {
        console.warn(
          "Failed to fetch announcements:",
          announcementResult.reason
        );
      }

      allNotifications.sort((a, b) => b.time - a.time);

      setNotifications(allNotifications.slice(0, 10));
    } catch (error) {
      console.error("Error in fetchNotifications orchestration:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateNotifications = (events) => {
    const notifs = [];
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    events.forEach((event) => {
      const startDate = new Date(event.startDate);
      const timeDiff = startDate - now;
      const createdDate = new Date(event.createdAt);
      const timeSinceCreation = now - createdDate;

      const cleanTitle = event.title.replace(
        /^(Quiz|Assignment|Test|Live Class):\s*/i,
        ""
      );

      if (timeSinceCreation < oneDay && timeSinceCreation > 0) {
        notifs.push({
          id: `new-${event._id}`,
          title: cleanTitle,
          message: `${
            event.extendedProps?.type || event.type || "Event"
          } published.`,
          className: event.classId?.name,
          type: "info",
          time: createdDate,
          icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
        });
      }

      if (
        timeDiff > 0 &&
        timeDiff <= oneDay &&
        timeDiff > oneDay - oneHour * 2
      ) {
        if (timeDiff > oneHour) {
          notifs.push({
            id: `day-${event._id}`,
            title: cleanTitle,
            message: `Due tomorrow`,
            className: event.classId?.name,
            type: "warning",
            time: startDate,
            icon: <Calendar className="w-4 h-4 text-amber-500" />,
          });
        }
      }

      if (timeDiff > 0 && timeDiff <= oneHour) {
        notifs.push({
          id: `hour-${event._id}`,
          title: cleanTitle,
          message: `Starting in < 1 hour`,
          className: event.classId?.name,
          type: "urgent",
          time: startDate,
          icon: <Clock className="w-4 h-4 text-red-500" />,
        });
      }
    });

    return notifs
      .sort((a, b) => {
        const priority = { urgent: 3, warning: 2, info: 1 };
        return priority[b.type] - priority[a.type];
      })
      .slice(0, 10);
  };

  const handleMarkAsRead = (id) => {
    if (readNotifications[id]) return;

    const updated = { ...readNotifications, [id]: Date.now() };
    setReadNotifications(updated);
    localStorage.setItem(
      `read_notifications_${studentId}`,
      JSON.stringify(updated)
    );
  };

  const handleMarkAllRead = () => {
    const now = Date.now();
    const updated = { ...readNotifications };
    notifications.forEach((n) => {
      if (!updated[n.id]) {
        updated[n.id] = now;
      }
    });
    setReadNotifications(updated);
    localStorage.setItem(
      `read_notifications_${studentId}`,
      JSON.stringify(updated)
    );
  };

  // Filter out expired notifications and calculate unread count
  useEffect(() => {
    const EXPIRY_MS = 10 * 60 * 1000;
    const now = Date.now();

    const filtered = notifications.filter((n) => {
      const readTime = readNotifications[n.id];
      if (!readTime) return true;
      return now - readTime < EXPIRY_MS;
    });

    setVisibleNotifications(filtered);

    const unread = filtered.filter((n) => !readNotifications[n.id]);
    setUnreadCount(unread.length);
  }, [notifications, readNotifications]);

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all focus:outline-none cursor-pointer"
      >
        <Bell className="w-6 h-6" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 25,
              }}
              className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"
            />
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-900 text-sm">
                Notifications
              </h3>
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-purple-600 font-medium cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-default"
                disabled={unreadCount === 0}
              >
                Mark all read
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Loading...
                </div>
              ) : visibleNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                visibleNotifications.map((notif) => {
                  const isRead = !!readNotifications[notif.id];
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkAsRead(notif.id)}
                      className={`px-4 py-3 border-b border-gray-50 last:border-0 transition-colors flex gap-3 items-start group cursor-pointer ${
                        isRead
                          ? "bg-white opacity-60 hover:opacity-100"
                          : "bg-purple-50/30 hover:bg-purple-50/60"
                      }`}
                    >
                      <div
                        className={`mt-1 p-1.5 rounded-full flex-shrink-0 ${
                          notif.type === "urgent"
                            ? "bg-red-50"
                            : notif.type === "warning"
                            ? "bg-amber-50"
                            : "bg-emerald-50"
                        }`}
                      >
                        {notif.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                            {notif.className && (
                              <span
                                className="font-bold text-gray-600 text-xs truncate max-w-[80px] bg-gray-100 px-1.5 py-0.5 rounded"
                                title={notif.className}
                              >
                                {notif.className}
                              </span>
                            )}
                            <h4
                              className={`text-sm font-semibold truncate ${
                                notif.type === "urgent"
                                  ? "text-red-700"
                                  : "text-gray-900"
                              } ${isRead ? "font-normal text-gray-600" : ""}`}
                              title={notif.title}
                            >
                              {notif.title}
                            </h4>
                          </div>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1.5"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 leading-snug">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          {notif.time
                            ? new Date(notif.time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Just now"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;