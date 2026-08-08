import React, { useState, useEffect } from 'react';
import { Camera, X, Save, Calendar, User as UserIcon, Building2, ArrowLeft, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import { getStoredToken, updateStoredUser } from '../utils/authStorage';
import API_BASE_URL from '../config';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    gender: '',
    collegeName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_URL = API_BASE_URL;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = getStoredToken();
      const response = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = response.data.user;
      setUser(userData);
      setFormData({
        name: userData.name || '',
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString().split('T')[0] : '',
        gender: userData.gender || '',
        collegeName: userData.collegeName || '',
      });
      setLoading(false);
    } catch {
      setError('Failed to load profile');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    setError('');
    setSuccess('');

    try {
      const token = getStoredToken();
      const formData = new FormData();
      formData.append('profilePhoto', file);

      const response = await axios.post(`${API_URL}/profile/photo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setUser(response.data.user);
      setSuccess('Profile photo updated successfully');
      
      updateStoredUser({ profilePhoto: response.data.user.profilePhoto });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to delete your profile photo?')) {
      return;
    }

    try {
      const token = getStoredToken();
      const response = await axios.delete(`${API_URL}/profile/photo`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data.user);
      setSuccess('Profile photo deleted successfully');
      
      updateStoredUser({ profilePhoto: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete photo');
    }
  };

  const handleBackgroundChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB');
      return;
    }

    setUploadingBackground(true);
    setError('');
    setSuccess('');

    try {
      const token = getStoredToken();
      const bgFormData = new FormData();
      bgFormData.append('backgroundImage', file);

      const response = await axios.post(`${API_URL}/profile/background`, bgFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setUser(response.data.user);
      setSuccess('Background image updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload background');
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleDeleteBackground = async () => {
    if (!window.confirm('Are you sure you want to delete your background image?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const token = getStoredToken();
      const response = await axios.delete(`${API_URL}/profile/background`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data.user);
      setSuccess('Background image deleted successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete background');
    }
  };

  const handleToggleBackground = async (useCustom) => {
    setError('');
    setSuccess('');

    try {
      const token = getStoredToken();
      const response = await axios.post(`${API_URL}/profile/background/toggle`, 
        { useCustomBackground: useCustom },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUser(response.data.user);
      setSuccess(useCustom ? 'Switched to custom background' : 'Switched to default background');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle background');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = getStoredToken();
      const response = await axios.put(`${API_URL}/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data.user);
      setSuccess('Profile updated successfully');
      
      updateStoredUser({ name: formData.name });
      
      // Reload page after 1 second to update navbar
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'T';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getProfilePhotoUrl = () => {
    if (user?.profilePhoto) {
      return `${API_URL.replace('/api', '')}/${user.profilePhoto}`;
    }
    return null;
  };

  const getBackgroundImageUrl = () => {
    if (user?.backgroundImage && user?.useCustomBackground) {
      return `${API_URL.replace('/api', '')}/${user.backgroundImage}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper font-body text-ink flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-ink-soft">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back to Dashboard Button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-purple-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </button>
        </div>

        <div className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
          {/* Header Section with Background */}
          <div 
            className="relative px-8 py-12 bg-cover bg-center"
            style={{
              backgroundImage: getBackgroundImageUrl() 
                ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${getBackgroundImageUrl()})`
                : 'linear-gradient(to right, #9333ea, #6d28d9)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Overlay for better text readability - removed as it's now in inline style */}
            
            {/* Background Upload Section */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <label
                htmlFor="bg-upload"
                className="flex items-center justify-center px-3 py-2 bg-surface rounded-lg cursor-pointer hover:bg-line text-ink transition-all shadow-md text-sm font-medium border border-line"
              >
                {uploadingBackground ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                ) : (
                  <Image className="w-4 h-4 mr-2" />
                )}
                {user?.backgroundImage ? 'Change' : 'Add'} Background
              </label>
              <input
                id="bg-upload"
                type="file"
                accept="image/*"
                onChange={handleBackgroundChange}
                className="hidden"
                disabled={uploadingBackground}
              />

              {user?.backgroundImage && (
                <button
                  onClick={handleDeleteBackground}
                  className="flex items-center justify-center px-3 py-2 bg-red-500 bg-opacity-90 rounded-lg hover:bg-opacity-100 transition-all shadow-md text-sm font-medium text-white"
                  title="Delete background"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Background Toggle Buttons */}
            {user?.backgroundImage && (
              <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                <button
                  onClick={() => handleToggleBackground(true)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    user?.useCustomBackground
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'bg-white/30 backdrop-blur-sm text-white hover:bg-white/55'
                  }`}
                >
                  Custom
                </button>
                <button
                  onClick={() => handleToggleBackground(false)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    !user?.useCustomBackground
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'bg-white/30 backdrop-blur-sm text-white hover:bg-white/55'
                  }`}
                >
                  Default
                </button>
              </div>
            )}

            {/* Content */}
            <div className="relative z-20 flex items-start gap-6">
              {/* Profile Photo Section */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-lg">
                  {getProfilePhotoUrl() ? (
                    <img
                      src={getProfilePhotoUrl()}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-purple-700 dark:text-[#A78BFA]">
                      {getInitials(user?.name)}
                    </span>
                  )}
                </div>
                
                {/* Photo Upload/Delete Buttons */}
                <div className="absolute bottom-0 right-0">
                  <label
                    htmlFor="photo-upload"
                    className="flex items-center justify-center w-10 h-10 bg-purple-600 rounded-full cursor-pointer hover:bg-purple-700 transition-colors shadow-lg"
                  >
                    {uploadingPhoto ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </div>

                {user?.profilePhoto && (
                  <button
                    onClick={handleDeletePhoto}
                    className="absolute top-0 right-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                    title="Delete photo"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>

              {/* Name and Email */}
              <div className="flex-1 text-white pt-2">
                <h1 className="text-3xl font-bold mb-2">{user?.name}</h1>
                <p className="text-purple-100 text-lg">{user?.email}</p>
                <div className="mt-3">
                  <span className="inline-block px-3 py-1 bg-purple-500 bg-opacity-50 rounded-full text-sm font-medium">
                    {user?.role === 'student' ? 'Student' : 'Teacher'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mx-6 sm:mx-8 mt-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-650 dark:text-rose-400 rounded-xl">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mx-6 sm:mx-8 mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-650 dark:text-emerald-400 rounded-xl">
              <p className="text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Form Section */}
          <form onSubmit={handleSaveProfile} className="p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold mb-6">Additional Details</h2>

            <div className="space-y-5">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5" />
                    Full Name
                  </div>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-line bg-paper rounded-xl text-ink outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dateOfBirth" className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Date of Birth
                  </div>
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-line bg-paper rounded-xl text-ink outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-line bg-paper rounded-xl text-ink outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>

              {/* College Name */}
              <div>
                <label htmlFor="collegeName" className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    College/University Name
                  </div>
                </label>
                <input
                  type="text"
                  id="collegeName"
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-line bg-paper rounded-xl text-ink outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                  placeholder="Enter your college/university name"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-settings-blue flex items-center gap-2 px-6 py-3 font-semibold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
