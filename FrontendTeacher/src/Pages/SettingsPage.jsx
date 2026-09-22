import React, { useState } from 'react';
import { ChevronLeft, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Header from '../components/Header';
import { getStoredToken, getStoredUser, clearAuth } from '../utils/authStorage';
import API_BASE_URL from '../config';
import { subscribeToPWAInstall, triggerInstall } from '../utils/pwaInstall';
import ConfirmationCard from '../components/ConfirmationCard';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeForm, setActiveForm] = useState('list'); // 'list' | 'password' | 'delete'
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Theme state
  const [isDarkTheme, setIsDarkTheme] = useState(() => document.documentElement.classList.contains('dark'));
  
  const [canInstall, setCanInstall] = useState(false);
  
  React.useEffect(() => {
    const unsubscribe = subscribeToPWAInstall(setCanInstall);
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const handleThemeChange = () => {
      setIsDarkTheme(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  // Notifications toggles
  const [notifNormal, setNotifNormal] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  // Fetch settings from API on mount
  React.useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const token = getStoredToken();
        const response = await axios.get(`${API_BASE_URL}/profile`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });
        const userProfile = response.data?.user;
        if (userProfile && userProfile.settings) {
          setNotifNormal(userProfile.settings.normalNotifications ?? true);
          setNotifEmail(userProfile.settings.emailNotifications ?? false);
        }
      } catch (err) {
        console.error("Error fetching user settings:", err);
      }
    };
    fetchUserSettings();
  }, []);

  const handleToggleNormal = async (checked) => {
    setNotifNormal(checked);
    try {
      const token = getStoredToken();
      await axios.put(
        `${API_BASE_URL}/profile/settings`,
        { normalNotifications: checked, emailNotifications: notifEmail },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      
      const storedUser = getStoredUser();
      if (storedUser) {
        storedUser.settings = {
          normalNotifications: checked,
          emailNotifications: notifEmail
        };
        localStorage.setItem('user', JSON.stringify(storedUser));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error("Error saving normal notifications settings:", err);
    }
  };

  const handleToggleEmail = async (checked) => {
    setNotifEmail(checked);
    try {
      const token = getStoredToken();
      await axios.put(
        `${API_BASE_URL}/profile/settings`,
        { normalNotifications: notifNormal, emailNotifications: checked },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      
      const storedUser = getStoredUser();
      if (storedUser) {
        storedUser.settings = {
          normalNotifications: notifNormal,
          emailNotifications: checked
        };
        localStorage.setItem('user', JSON.stringify(storedUser));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error("Error saving email notifications settings:", err);
    }
  };

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Delete Account state
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePass, setShowDeletePass] = useState(false);

  // Info status flags
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const user = getStoredUser() || {};
  const userEmail = user.email || 'riya@adhyan.ai';

  const resetPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handlePasswordCancel = () => {
    resetPasswordFields();
    setActiveForm('list');
  };

  const validatePassword = () => {
    if (!currentPassword.trim()) return setError('Current password is required'), false;
    if (!newPassword.trim()) return setError('New password is required'), false;
    if (!confirmPassword.trim()) return setError('Please confirm your new password'), false;
    if (newPassword !== confirmPassword) return setError('New passwords do not match'), false;
    if (newPassword.length < 6) return setError('New password must be at least 6 characters'), false;
    if (newPassword === currentPassword) return setError('New password must be different'), false;
    return true;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validatePassword()) return;
    setLoading(true);
    try {
      const token = getStoredToken();
      await axios.post(
        `${API_BASE_URL}/profile/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      setSuccess('Password changed successfully');
      resetPasswordFields();
      setTimeout(() => {
        setActiveForm('list');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleDeleteAccountSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (deleteEmail.trim() !== userEmail) {
      setError('Email verification failed');
      return;
    }
    if (!deletePassword) {
      setError('Password is required to confirm deletion');
      return;
    }

    setLoading(true);
    try {
      const token = getStoredToken();
      await axios.post(
        `${API_BASE_URL}/profile/deactivate`,
        { password: deletePassword },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      
      alert('Your account has been successfully deactivated. Thank you for using ADHYAN.AI.');
      clearAuth();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to deactivate account');
    } finally {
      setLoading(false);
    }
  };

  const emailMismatch = deleteEmail.trim() !== '' && deleteEmail.trim() !== userEmail;

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Back Button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-purple-700 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" /> Back to Dashboard
          </button>
        </div>

        {/* Title */}
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-wider text-purple-700 font-semibold mb-1">Dashboard Settings</p>
          <h1 className="font-display text-4xl font-semibold">Settings</h1>
        </div>

        {/* Section 1: Notifications */}
        <h2 className="font-display text-2xl font-semibold mb-4 mt-8">Notifications</h2>
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1 pr-4">
              <strong className="text-sm sm:text-base text-ink font-semibold">Normal Notifications</strong>
              <span className="text-xs sm:text-sm text-ink-soft">Enable notifications in header bell icon and toast alerts</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={notifNormal} 
                onChange={(e) => handleToggleNormal(e.target.checked)} 
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="flex items-center justify-between border-t border-line dashed-border pt-5 mt-5">
            <div className="flex flex-col gap-1 pr-4">
              <strong className="text-sm sm:text-base text-ink font-semibold">Email Notifications</strong>
              <span className="text-xs sm:text-sm text-ink-soft">Receive daily class updates and assessment evaluation alerts</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={notifEmail} 
                onChange={(e) => handleToggleEmail(e.target.checked)} 
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Section 2: Appearance */}
        <h2 className="font-display text-2xl font-semibold mb-4 mt-8">Appearance</h2>
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1 pr-4">
              <strong className="text-sm sm:text-base text-ink font-semibold">Theme</strong>
              <span className="text-xs sm:text-sm text-ink-soft">Choose your preferred appearance</span>
            </div>
            <div className="flex bg-line/30 p-1 rounded-lg border border-line">
              <button
                onClick={() => {
                  document.documentElement.classList.remove('dark');
                  localStorage.setItem('theme', 'light');
                  window.dispatchEvent(new Event('themeChange'));
                  setIsDarkTheme(false);
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                  !isDarkTheme 
                    ? 'bg-surface text-ink shadow-sm' 
                    : 'text-ink-soft hover:text-ink hover:bg-surface/50'
                }`}
              >
                Light Theme
              </button>
              <button
                onClick={() => {
                  document.documentElement.classList.add('dark');
                  localStorage.setItem('theme', 'dark');
                  window.dispatchEvent(new Event('themeChange'));
                  setIsDarkTheme(true);
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                  isDarkTheme 
                    ? 'bg-surface text-ink shadow-sm' 
                    : 'text-ink-soft hover:text-ink hover:bg-surface/50'
                }`}
              >
                Dark Theme
              </button>
            </div>
          </div>
        </div>

        {canInstall && (
          <>
            <h2 className="font-display text-2xl font-semibold mb-4 mt-8">Application</h2>
            <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm mb-8">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1 pr-4">
                  <strong className="text-sm sm:text-base text-ink font-semibold">Install App</strong>
                  <span className="text-xs sm:text-sm text-ink-soft">Install ADHYAN.AI on your device for a better experience</span>
                </div>
                <button
                  onClick={triggerInstall}
                  className="btn-settings-blue"
                >
                  Download App
                </button>
              </div>
            </div>
          </>
        )}

        {/* Section 3: Account */}
        <h2 className="font-display text-2xl font-semibold mb-4">Account</h2>

        {/* Unified Accordion Card List */}
        <div className="space-y-4">
          
          {/* Unified Update Password Box */}
          <div className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between p-4 sm:p-5">
              <strong className="text-sm sm:text-base text-ink font-bold">Update Password</strong>
              <button 
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setActiveForm(activeForm === 'password' ? 'list' : 'password');
                }} 
                className="btn-settings-outline"
              >
                {activeForm === 'password' ? 'Close' : 'Open'}
              </button>
            </div>

            {/* Collapsible form area inside the same box */}
            <AnimatePresence initial={false}>
              {activeForm === 'password' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden border-t border-line"
                >
                  <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4 bg-surface">
                    <div className="form-input-field">
                      <label>Current Password</label>
                      <div className="password-field-container">
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="focus:ring-2 focus:ring-purple-700 focus:border-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="password-eye-btn"
                        >
                          {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="form-input-field">
                      <label>New Password</label>
                      <div className="password-field-container">
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="focus:ring-2 focus:ring-purple-700 focus:border-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="password-eye-btn"
                        >
                          {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="form-input-field">
                      <label>Confirm New Password</label>
                      <div className="password-field-container">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="focus:ring-2 focus:ring-purple-700 focus:border-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="password-eye-btn"
                        >
                          {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                    {success && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-settings-blue-large disabled:opacity-50"
                    >
                      {loading ? 'Updating password...' : 'Update Password'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Unified Logout Box */}
          <div className="bg-surface border border-line rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
            <strong className="text-sm sm:text-base text-ink font-bold">Logout</strong>
            <button 
              onClick={() => setShowLogoutConfirm(true)} 
              className="btn-settings-blue"
            >
              Logout
            </button>
          </div>

          {/* Unified Delete Account Box */}
          <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between p-4 sm:p-5">
              <strong className="text-sm sm:text-base text-[#9F1239] font-bold">Delete Account</strong>
              <button 
                onClick={() => {
                  setError('');
                  setDeleteEmail('');
                  setDeletePassword('');
                  setActiveForm(activeForm === 'delete' ? 'list' : 'delete');
                }} 
                className="btn-settings-red-outline"
              >
                {activeForm === 'delete' ? 'Close' : 'Delete Account'}
              </button>
            </div>

            {/* Collapsible delete form area inside the same box */}
            <AnimatePresence initial={false}>
              {activeForm === 'delete' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden border-t border-[#FECDD3]"
                >
                  <form onSubmit={handleDeleteAccountSubmit} className="p-5 space-y-4">
                    <div className="danger-banner">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <div className="danger-banner-content">
                        <strong>Danger Zone</strong>
                        <span>This action is permanent. All your data will be deleted from our servers.</span>
                      </div>
                    </div>

                    <div className="form-input-field">
                      <label className="text-[#9F1239]">Type your email to confirm</label>
                      <input
                        type="text"
                        value={deleteEmail}
                        onChange={(e) => setDeleteEmail(e.target.value)}
                        placeholder={`Type your email: ${userEmail}`}
                        className="focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none border border-rose-300 dark:border-rose-800 bg-surface"
                      />
                      {emailMismatch && (
                        <div className="validation-warning-txt">Email does not match</div>
                      )}
                    </div>

                    <div className="form-input-field">
                      <label className="text-[#9F1239]">Password</label>
                      <div className="password-field-container">
                        <input
                          type={showDeletePass ? 'text' : 'password'}
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="Enter password to confirm account deletion"
                          className="focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none border border-rose-300 dark:border-rose-800 bg-surface"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDeletePass(!showDeletePass)}
                          className="password-eye-btn hover:text-[#9F1239]"
                        >
                          {showDeletePass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

                    <button
                      type="submit"
                      disabled={loading || deleteEmail.trim() !== userEmail}
                      className="btn-settings-red-large disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {loading ? 'Permanently deleting...' : 'Permanently Delete Account'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

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
    </div>
  );
}
