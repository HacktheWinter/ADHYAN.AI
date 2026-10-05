import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Settings, User, UserPlus, X, Search, ArrowLeft, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import NotificationDropdown from './NotificationDropdown';
import { clearAuth, getStoredUser, getStoredToken, getBrowserId } from '../utils/authStorage';
import API_BASE_URL, { LANDING_PAGE_URL } from '../config';
import ConfirmationCard from './ConfirmationCard';
import { subscribeToPWAInstall, triggerInstall } from '../utils/pwaInstall';

export default function StudentNavbar({ searchQuery = '', onSearchChange = () => {}, isMobileSearchOpen: isMobileSearchOpenProp, onMobileSearchChange }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileSearchLocal, setIsMobileSearchLocal] = useState(false);
  const isMobileSearchOpen = isMobileSearchOpenProp !== undefined ? isMobileSearchOpenProp : isMobileSearchLocal;
  const setIsMobileSearchOpen = onMobileSearchChange || setIsMobileSearchLocal;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const syncUser = () => {
      setUser(getStoredUser());
    };

    syncUser();
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  useEffect(() => {
    return subscribeToPWAInstall(setCanInstall);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    // Fire-and-forget: call backend to record cooldown, then clear auth locally.
    // Even if the API call fails, we still clear the client-side auth state.
    try {
      const token = getStoredToken();
      const browserId = getBrowserId();
      if (token) {
        // Don't await — we clear auth immediately for UX
        axios.post(
          `${API_BASE_URL}/student/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Browser-ID': browserId,
            },
          }
        ).catch(() => {}); // Silently ignore errors
      }
    } catch { /* ignore */ }

    clearAuth();
    setUser(null);
    setIsDropdownOpen(false);
    navigate('/login');
  };

  const getDisplayName = (u) => {
    if (!u) return '';
    if (u.name && u.name.trim()) return u.name;
    if (u.fullName && u.fullName.trim()) return u.fullName;
    if (u.email) {
      const local = u.email.split('@')[0];
      return local
        .replace(/[_.\-+]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
    }
    return 'User';
  };

  const getInitials = (name) => {
    if (!name) return 'u';
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => p[0]).join('').slice(0, 2).toLowerCase();
  };

  const getProfilePhotoUrl = () => {
    if (user?.profilePhoto) {
      const BASE_URL = API_BASE_URL.replace('/api', '');
      return `${BASE_URL}/${user.profilePhoto}`;
    }
    return null;
  };

  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);

  const handleSearchInput = (value) => {
    onSearchChange(value);
  };

  const handleSearchClick = () => {
    navigate('/');
  };

  const clearSearch = () => {
    if (searchQuery) {
      onSearchChange('');
    }
  };

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {isMobileSearchOpen ? (
              <div className="flex items-center w-full gap-2">
                <button
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search your courses..."
                    className="w-full px-4 py-2 pl-10 pr-10 text-gray-700 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:bg-white"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onClick={handleSearchClick}
                    autoFocus
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <a 
                  href={LANDING_PAGE_URL}
                  className="flex items-center space-x-2.5 focus:outline-none"
                >
                  <img 
                    src="/logo02.png" 
                    alt="ADHYAN.AI Logo" 
                    className="w-12 h-12 object-contain bg-white rounded-xl p-1 shadow-sm border border-gray-100"
                  />
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">ADHYAN.AI</h1>
                    <p className="text-sm text-gray-500 leading-tight">Student Panel</p>
                  </div>
                </a>

                {/* Desktop Search */}
                <div className="hidden md:block flex-1 max-w-2xl mx-8">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search your courses..."
                      className="w-full px-4 py-2 pl-10 pr-10 text-gray-700 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:bg-white"
                      value={searchQuery}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      onClick={handleSearchClick}
                      aria-label="Search courses"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Mobile Search Icon */}
                  <button
                    onClick={() => setIsMobileSearchOpen(true)}
                    className="md:hidden p-2 text-gray-600 hover:text-gray-900 focus:outline-none rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Search"
                  >
                    <Search className="w-5 h-5" />
                  </button>

                  {/* Notification Dropdown */}
                  <NotificationDropdown />
            
              {/* Profile Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <motion.button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-white font-semibold hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 overflow-hidden shadow-md hover:shadow-lg cursor-pointer"
                >
                  {getProfilePhotoUrl() ? (
                    <img
                      src={getProfilePhotoUrl()}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm">{initials}</span>
                  )}
                </motion.button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 origin-top-right"
                    >
                      {user ? (
                        <>
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>

                          <div className="py-2">
                            <Link
                              to="/profile"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors focus:outline-none"
                            >
                              <User className="w-4 h-4 mr-3" /> My Profile
                            </Link>
                            <Link
                              to="/settings"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors focus:outline-none"
                            >
                              <Settings className="w-4 h-4 mr-3" /> Settings
                            </Link>
                          </div>

                          <div className="border-t border-gray-100 py-2">
                            {canInstall && (
                              <button
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  triggerInstall();
                                }}
                                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors focus:outline-none cursor-pointer"
                              >
                                <Download className="w-4 h-4 mr-3" /> Install App
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setIsDropdownOpen(false);
                                setShowLogoutConfirm(true);
                              }}
                              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors focus:outline-none cursor-pointer"
                            >
                              <LogOut className="w-4 h-4 mr-3" /> Logout
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="py-2">
                          <Link
                            to="/login"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors focus:outline-none"
                          >
                            <LogIn className="w-4 h-4 mr-3" /> Login
                          </Link>
                          <Link
                            to="/signup"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors focus:outline-none"
                          >
                            <UserPlus className="w-4 h-4 mr-3" /> Sign Up
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </div>
              </>
            )}
          </div>
        </div>
      </nav>

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
}
