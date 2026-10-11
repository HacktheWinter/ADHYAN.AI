import React, { useState } from 'react';
import { ChevronLeft, Eye, EyeOff, Bell, BellRing, Smartphone, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import StudentNavbar from '../components/StudentNavbar';
import { getStoredToken } from '../utils/authStorage';
import API_BASE_URL from '../config';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  isNotificationSupported,
} from '../utils/notificationService';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Notification Shade state
  const [permission, setPermission] = useState(getNotificationPermission());
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState({ type: '', message: '' });

  const handleRequestPermission = async () => {
    setNotifLoading(true);
    setNotifFeedback({ type: '', message: '' });
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === 'granted') {
        setNotifFeedback({
          type: 'success',
          message: 'Notifications enabled! You will now receive alerts in your notification shade.',
        });
      } else if (result === 'denied') {
        setNotifFeedback({
          type: 'error',
          message: 'Permission was blocked. Please click the icon in your browser address bar to allow notifications.',
        });
      }
    } catch {
      setNotifFeedback({ type: 'error', message: 'Failed to request notification permission.' });
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    setNotifLoading(true);
    setNotifFeedback({ type: '', message: '' });
    try {
      const res = await sendTestNotification();
      setPermission(getNotificationPermission());
      setNotifFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch {
      setNotifFeedback({ type: 'error', message: 'Error sending test notification.' });
    } finally {
      setNotifLoading(false);
    }
  };

  const resetState = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const validate = () => {
    if (!currentPassword.trim()) return setError('Current password is required'), false;
    if (!newPassword.trim()) return setError('New password is required'), false;
    if (!confirmPassword.trim()) return setError('Please confirm your new password'), false;
    if (newPassword !== confirmPassword) return setError('New passwords do not match'), false;
    if (newPassword.length < 6) return setError('New password must be at least 6 characters'), false;
    if (newPassword === currentPassword) return setError('New password must be different'), false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;
    setLoading(true);
    try {
      const token = getStoredToken();
      await axios.post(
        `${API_BASE_URL}/profile/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      setSuccess('Password changed successfully');
      resetState();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNavbar />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-700"
          >
            <ChevronLeft className="w-5 h-5" /> Back to Course
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500">Update your password securely.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-700 focus:border-transparent"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-700 focus:border-transparent"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-700 focus:border-transparent"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-700 text-white py-2 rounded-lg font-medium hover:bg-purple-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Changing password...' : 'Change password'}
              </button>
            </div>
          </form>
        </div>

        {/* Device & PWA Notification Shade Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-purple-50 rounded-xl text-purple-700">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Device & Notification Shade Alerts
                </h2>
                <p className="text-sm text-gray-500">
                  Receive native notifications in your Android/iOS notification drawer and status bar.
                </p>
              </div>
            </div>

            {/* Permission status badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  permission === 'granted'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : permission === 'denied'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {permission === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Shade Active
                  </>
                ) : permission === 'denied' ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Permission Blocked
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5" />
                    Permission Required
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-5">
            <div className="flex flex-wrap items-center gap-3">
              {permission !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  disabled={notifLoading || !isNotificationSupported()}
                  className="bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <BellRing className="w-4 h-4" />
                  Enable Notification Shade Alerts
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  disabled={notifLoading}
                  className="bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {notifLoading ? 'Sending...' : 'Send Test Notification to Shade'}
                </button>
              )}

              {permission === 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Re-check Permission
                </button>
              )}
            </div>

            {notifFeedback.message && (
              <div
                className={`mt-3 text-xs p-2.5 rounded-lg border ${
                  notifFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {notifFeedback.message}
              </div>
            )}
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
            <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-2xs">
              <p className="font-semibold text-gray-900 mb-1">📱 Lock Screen & Drawer</p>
              <p>Alerts show in your device's pull-down notification shade, even when browser is minimized.</p>
            </div>
            <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-2xs">
              <p className="font-semibold text-gray-900 mb-1">⏰ Quiz & Class Reminders</p>
              <p>Get notified when a scheduled quiz, test, or live class begins within 1 hour.</p>
            </div>
            <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-2xs">
              <p className="font-semibold text-gray-900 mb-1">📢 Instant Announcements</p>
              <p>Direct updates whenever new course notes or teacher announcements are posted.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
