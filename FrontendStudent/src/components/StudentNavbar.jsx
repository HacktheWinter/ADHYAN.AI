import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Settings, User, UserPlus, X } from 'lucide-react';
import { clearAuth, getStoredUser } from '../utils/authStorage';

export default function StudentNavbar({ searchQuery = '', onSearchChange = () => {} }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
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
      return `http://localhost:5000/${user.profilePhoto}`;
    }
    return null;
  };

  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);

  const handleSearchInput = (value) => {
    onSearchChange(value);
  };

  const clearSearch = () => {
    if (searchQuery) {
      onSearchChange('');
    }
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <a href="https://adhyanai-5eum.onrender.com/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-700 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ADHYAN.AI</h1>
                <p className="text-sm text-gray-500">Student Panel</p>
              </div>
            </a>

            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search your courses..."
                  className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent transition-all"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  aria-label="Search courses"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-white font-semibold hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-700 focus:ring-offset-2 cursor-pointer overflow-hidden"
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
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
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
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                        >
                          <User className="w-4 h-4 mr-3" /> My Profile
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                        >
                          <Settings className="w-4 h-4 mr-3" /> Settings
                        </Link>
                      </div>

                      <div className="border-t border-gray-100 py-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                      >
                        <LogIn className="w-4 h-4 mr-3" /> Login
                      </Link>
                      <Link
                        to="/signup"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                      >
                        <UserPlus className="w-4 h-4 mr-3" /> Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

    </>
  );
}