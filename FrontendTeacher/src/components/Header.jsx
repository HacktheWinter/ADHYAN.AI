import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, LogIn, UserPlus } from 'lucide-react';

const Header = ({ onLogoClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsDropdownOpen(false);
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={onLogoClick}
        >
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
            <div className="grid grid-cols-3 gap-0.5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-1 h-1 bg-white rounded-full"></div>
              ))}
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ADHYAN.AI</h1>
            <p className="text-sm text-gray-500">Teacher Panel</p>
          </div>
        </div>
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 cursor-pointer"
          >
            <span className="text-sm">{user ? getInitials(user.name) : 'T'}</span>
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
                        // Navigate to profile page when implemented
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-3" /> My Profile
                    </button>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        // Navigate to settings page when implemented
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
    </header>
  );
};

export default Header;