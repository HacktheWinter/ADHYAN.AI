import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Settings, User, UserPlus, Trash2, Bell, MoreVertical, MessageSquare, HelpCircle, Sun, Moon, Download } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { clearAuth, getStoredUser } from '../utils/authStorage';
import API_BASE_URL, { LANDING_PAGE_URL } from '../config';
import { subscribeToPWAInstall, triggerInstall } from '../utils/pwaInstall';
import ConfirmationCard from './ConfirmationCard';

let globalTheme = localStorage.getItem('theme') || 'light';

const Header = ({ onLogoClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (globalTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return globalTheme;
  });
  
  const [canInstall, setCanInstall] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  useEffect(() => {
    return subscribeToPWAInstall(setCanInstall);
  }, []);

  // Custom dynamic notifications list state
  const [notifications, setNotifications] = useState([]);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const moreRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    globalTheme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    window.dispatchEvent(new Event('themeChange'));
  }, [theme]);

  useEffect(() => {
    const handleThemeEvent = () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (theme !== (isDark ? 'dark' : 'light')) {
        setTheme(isDark ? 'dark' : 'light');
      }
    };
    window.addEventListener('themeChange', handleThemeEvent);
    return () => window.removeEventListener('themeChange', handleThemeEvent);
  }, [theme]);

  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());
    syncUser();
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  // Fetch notifications dynamically based on unanswered student doubts
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      if (user.settings?.normalNotifications === false) {
        setNotifications([]);
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/doubts`);
        const doubts = response.data || [];
        
        const storedRead = JSON.parse(localStorage.getItem(`read_notifications_${user.id || user._id}`) || '{}');
        const storedDeleted = JSON.parse(localStorage.getItem(`deleted_notifications_${user.id || user._id}`) || '[]');
        
        const mappedNotifs = doubts
          .filter(d => !storedDeleted.includes(`doubt-${d._id}`))
          .map(d => {
            const hasTeacherReply = d.replies?.some(r => r.authorRole === "teacher");
            return {
              id: `doubt-${d._id}`,
              title: hasTeacherReply ? "Resolved Doubt" : "Pending Doubt",
              description: `${d.authorName || "Student"} asked: "${d.title}"`,
              read: !!storedRead[`doubt-${d._id}`],
              time: d.createdAt,
              createdAt: new Date(d.createdAt),
              path: `/class/${d.classId}/doubts`
            };
          });

        // Add a default onboarding welcome notification if there are no doubts
        if (mappedNotifs.length === 0 && !storedDeleted.includes("welcome-onboarding")) {
          mappedNotifs.push({
            id: "welcome-onboarding",
            title: "Welcome to Adhyan.AI",
            description: "Set up your active classes and share access codes with students.",
            read: !!storedRead["welcome-onboarding"],
            time: new Date(),
            createdAt: new Date(),
            path: "/"
          });
        }

        // Sort by time descending
        mappedNotifs.sort((a, b) => b.createdAt - a.createdAt);
        setNotifications(mappedNotifs.slice(0, 10));
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // refresh every 15s for responsiveness
    return () => clearInterval(interval);
  }, [user]);

  // Listen to outside clicks to collapse dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setIsMoreOpen(false);
      }
    };
    
    const handleCollapseAll = () => {
      setIsNotifOpen(false);
      setIsDropdownOpen(false);
      setIsMoreOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    // Capture scroll events at any container level
    window.addEventListener('scroll', handleCollapseAll, { capture: true, passive: true });
    
    // Collapse menus when switching focus to another window or tab
    window.addEventListener('blur', handleCollapseAll);
    document.addEventListener('visibilitychange', handleCollapseAll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleCollapseAll, { capture: true });
      window.removeEventListener('blur', handleCollapseAll);
      document.removeEventListener('visibilitychange', handleCollapseAll);
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setIsDropdownOpen(false);
    setShowLogoutConfirm(false);
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'T';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getProfilePhotoUrl = () => {
    if (user?.profilePhoto) {
      return `${API_BASE_URL.replace('/api', '')}/${user.profilePhoto}`;
    }
    return null;
  };

  // Notification Operations
  const handleDeleteNotif = (id, e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    
    const storedDeleted = JSON.parse(localStorage.getItem(`deleted_notifications_${user?.id || user?._id}`) || '[]');
    if (!storedDeleted.includes(id)) {
      storedDeleted.push(id);
      localStorage.setItem(`deleted_notifications_${user?.id || user?._id}`, JSON.stringify(storedDeleted));
    }
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    
    const storedRead = JSON.parse(localStorage.getItem(`read_notifications_${user?.id || user?._id}`) || '{}');
    notifications.forEach(n => {
      storedRead[n.id] = Date.now();
    });
    localStorage.setItem(`read_notifications_${user?.id || user?._id}`, JSON.stringify(storedRead));
  };

  const handleClearNotifications = (e) => {
    e.stopPropagation();
    const idsToClear = notifications.map(n => n.id);
    setNotifications([]);
    
    const storedDeleted = JSON.parse(localStorage.getItem(`deleted_notifications_${user?.id || user?._id}`) || '[]');
    idsToClear.forEach(id => {
      if (!storedDeleted.includes(id)) {
        storedDeleted.push(id);
      }
    });
    localStorage.setItem(`deleted_notifications_${user?.id || user?._id}`, JSON.stringify(storedDeleted));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
       <header className="bg-surface border-b border-line shadow-sm sticky top-0 z-50 font-body">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Section */}
            <motion.div 
              onClick={onLogoClick || (() => navigate('/'))}
              className="flex items-center space-x-1 cursor-pointer"
            >
              <img 
                src="/logo02.png" 
                alt="ADHYAN.AI Logo" 
                className="w-10 sm:w-13 object-contain"
              />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-ink">ADHYAN.AI</h1>
                <p className="text-xs sm:text-sm text-ink-soft">Teacher Panel</p>
              </div>
            </motion.div>
 
            <div className="flex items-center gap-2 sm:gap-4">
              


              {/* Notifications bell icon & popover */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => { setIsNotifOpen(!isNotifOpen); setIsDropdownOpen(false); setIsMoreOpen(false); }}
                  className="w-10 h-10 rounded-full border border-line bg-surface hover:bg-paper text-ink-soft hover:text-purple-700 dark:hover:text-[#A78BFA] flex items-center justify-center relative transition-all cursor-pointer focus:outline-none"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 stroke-[2px]" />
                  {unreadCount > 0 && user?.settings?.normalNotifications !== false && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#2563EB] text-[10px] text-white flex items-center justify-center font-bold border border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown popover matching screenshot */}
                <AnimatePresence>
                  {isNotifOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-[-55px] sm:right-0 mt-2 w-80 sm:w-[340px] max-w-[calc(100vw-24px)] bg-surface rounded-xl shadow-xl border border-line p-4 z-50"
                    >
                      {/* Popover Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-line">
                        <span className="font-bold text-[15px] text-ink">Notifications</span>
                        <span className="text-[12px] text-ink-soft font-semibold">{unreadCount} unread</span>
                      </div>

                      {/* Popover List */}
                      <div className="max-h-[260px] overflow-y-auto space-y-2 my-3 pr-1">
                        {user?.settings?.normalNotifications === false ? (
                          <div className="py-8 text-center text-xs text-ink-soft">
                            Notifications are disabled in settings.
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-ink-soft">
                            No notifications available
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div 
                              key={n.id}
                              onClick={(e) => {
                                const storedRead = JSON.parse(localStorage.getItem(`read_notifications_${user?.id || user?._id}`) || '{}');
                                storedRead[n.id] = Date.now();
                                localStorage.setItem(`read_notifications_${user?.id || user?._id}`, JSON.stringify(storedRead));
                                setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                                if (n.path) {
                                  navigate(n.path);
                                  setIsNotifOpen(false);
                                }
                              }}
                              className={`p-3 rounded-lg border flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                                !n.read 
                                  ? 'bg-[#F0F6FF] dark:bg-[#0D1B2A] border-[#D0E2FF] dark:border-[#1E3A5F] hover:bg-[#E5F0FF] dark:hover:bg-[#132D46]' 
                                  : 'bg-surface border-line hover:bg-paper'
                              }`}
                            >
                              <div className="flex flex-col gap-0.5">
                                <strong className="text-[13.5px] font-bold text-ink leading-snug">{n.title}</strong>
                                <span className="text-[12px] text-ink-soft leading-normal">{n.description}</span>
                              </div>
                              <button
                                onClick={(e) => handleDeleteNotif(n.id, e)}
                                className="text-ink-soft hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1 flex-shrink-0 cursor-pointer"
                                title="Dismiss notification"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Popover Footer Action Buttons */}
                      <div className="border-t border-line pt-3 flex gap-2">
                        <button
                          onClick={handleMarkAllRead}
                          className="btn-notif-read flex-1 py-2 text-center text-[12px] font-bold border rounded-lg cursor-pointer transition-colors"
                        >
                          Mark all read
                        </button>
                        <button
                          onClick={handleClearNotifications}
                          className="btn-notif-clear flex-1 py-2 text-center text-[12px] font-bold border rounded-lg cursor-pointer transition-colors"
                        >
                          Clear notifications
                        </button>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Flex container wrapping profile and 3-dot more button close together */}
              <div className="flex items-center gap-1.5">
                {/* Profile Avatar Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => { setIsDropdownOpen(!isDropdownOpen); setIsNotifOpen(false); setIsMoreOpen(false); }}
                    className="w-10 h-10 rounded-full bg-purple-600 border border-line flex items-center justify-center text-white font-semibold hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 cursor-pointer overflow-hidden"
                  >
                    {getProfilePhotoUrl() ? (
                      <img
                        src={getProfilePhotoUrl()}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm">{user ? getInitials(user.name) : 'T'}</span>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-lg border border-line py-2 z-50"
                      >
                        {user ? (
                          <>
                            <div className="px-4 py-3 border-b border-line">
                              <p className="text-sm font-semibold text-ink">{user.name}</p>
                              <p className="text-xs text-ink-soft">{user.email}</p>
                            </div>

                            <div className="py-2">
                              <button
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  navigate('/profile');
                                }}
                                className="dropdown-item w-full flex items-center px-4 py-2 text-sm text-ink transition-colors text-left cursor-pointer"
                              >
                                <User className="w-4 h-4 mr-3" /> My Profile
                              </button>
                              <button
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  navigate('/settings');
                                }}
                                className="dropdown-item w-full flex items-center px-4 py-2 text-sm text-ink transition-colors text-left cursor-pointer"
                              >
                                <Settings className="w-4 h-4 mr-3" /> Settings
                              </button>
                            </div>

                            <div className="border-t border-line py-2">
                              {canInstall && (
                                <button
                                  onClick={() => {
                                    setIsDropdownOpen(false);
                                    triggerInstall();
                                  }}
                                  className="dropdown-item w-full flex items-center px-4 py-2 text-sm text-ink transition-colors text-left cursor-pointer"
                                >
                                  <Download className="w-4 h-4 mr-3" /> Install App
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  setShowLogoutConfirm(true);
                                }}
                                className="dropdown-item-danger w-full flex items-center px-4 py-2 text-sm text-rose-600 dark:text-rose-400 transition-colors text-left cursor-pointer"
                              >
                                <LogOut className="w-4 h-4 mr-3" /> Logout
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="py-2">
                            <button
                              onClick={() => {
                                  setIsDropdownOpen(false);
                                  navigate('/login');
                                }}
                              className="dropdown-item w-full flex items-center px-4 py-2 text-sm text-ink transition-colors text-left"
                            >
                              <LogIn className="w-4 h-4 mr-3" /> Login
                            </button>
                            <button
                              onClick={() => {
                                  setIsDropdownOpen(false);
                                  navigate('/signup');
                                }}
                              className="dropdown-item w-full flex items-center px-4 py-2 text-sm text-ink transition-colors text-left"
                            >
                              <UserPlus className="w-4 h-4 mr-3" /> Sign Up
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>


              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <ConfirmationCard
        isOpen={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout? You will need to sign in again to access your account."
        confirmText="Logout"
        cancelText="Cancel"
        type="warning"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
};

export default Header;
