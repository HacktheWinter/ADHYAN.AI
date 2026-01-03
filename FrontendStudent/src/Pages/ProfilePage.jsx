import React, { useState, useEffect } from 'react';
import { Camera, X, Save, Calendar, User as UserIcon, Building2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    gender: '',
    collegeName: '',
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
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
    } catch (err) {
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
      const token = localStorage.getItem('token');
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
      
      // Update user in localStorage
      const storedUser = JSON.parse(localStorage.getItem('user'));
      localStorage.setItem('user', JSON.stringify({ ...storedUser, profilePhoto: response.data.user.profilePhoto }));
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
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/profile/photo`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data.user);
      setSuccess('Profile photo deleted successfully');
      
      // Update user in localStorage
      const storedUser = JSON.parse(localStorage.getItem('user'));
      localStorage.setItem('user', JSON.stringify({ ...storedUser, profilePhoto: '' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete photo');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data.user);
      setSuccess('Profile updated successfully');
      
      // Update user name in localStorage
      const storedUser = JSON.parse(localStorage.getItem('user'));
      localStorage.setItem('user', JSON.stringify({ ...storedUser, name: formData.name }));
      
      // Reload page after 1 second to update navbar
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back to Course Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-purple-700 mb-4 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Course</span>
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-8 py-12">
            <div className="flex items-start gap-6">
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
                    <span className="text-4xl font-bold text-purple-700">
                      {getInitials(user?.name)}
                    </span>
                  )}
                </div>
                
                {/* Photo Upload/Delete Buttons */}
                <div className="absolute bottom-0 right-0">
                  <label
                    htmlFor="photo-upload"
                    className="flex items-center justify-center w-10 h-10 bg-purple-700 rounded-full cursor-pointer hover:bg-purple-800 transition-colors shadow-lg"
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
            <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mx-8 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Form Section */}
          <form onSubmit={handleSaveProfile} className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Details</h2>

            <div className="space-y-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    Full Name
                  </div>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date of Birth
                  </div>
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
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
                <label htmlFor="collegeName" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    College/University Name
                  </div>
                </label>
                <input
                  type="text"
                  id="collegeName"
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                  placeholder="Enter your college/university name"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors disabled:bg-purple-400 disabled:cursor-not-allowed font-medium"
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
