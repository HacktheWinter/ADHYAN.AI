import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Settings, User, UserPlus } from 'lucide-react';
import { clearAuth, getStoredUser } from '../utils/authStorage';

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());
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

  const getInitials = (name) => {
    if (!name) return 'T';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getProfilePhotoUrl = () => {
    if (user?.profilePhoto) {
      return `http://localhost:5000/${user.profilePhoto}`;
    }
    return null;
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 ">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <a
              href="https://adhyanai-5eum.onrender.com/"
              className="flex items-center space-x-2"
            >
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
                <p className="text-sm text-gray-500">Teacher Panel</p>
              </div>
            </a>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 cursor-pointer overflow-hidden"
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
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>

                      <div className="py-2">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            navigate('/profile');
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                        >
                          <User className="w-4 h-4 mr-3" /> My Profile
                        </button>
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            navigate('/settings');
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                        >
                          <Settings className="w-4 h-4 mr-3" /> Settings
                        </button>
                      </div>

                      <div className="border-t border-gray-100 py-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
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
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left"
                      >
                        <LogIn className="w-4 h-4 mr-3" /> Login
                      </button>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          navigate('/signup');
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left"
                      >
                        <UserPlus className="w-4 h-4 mr-3" /> Sign Up
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

    </>
  );
};

export default Header;