import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { User, Shield, Save, Upload, UserCircle } from 'lucide-react';

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile State
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    username: '',
    address: '',
    profile_image: '',
    // Client specific
    full_name: '',
    cnic: '',
    whatsapp_number: '',
    portal_username: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Security State
  const [securityData, setSecurityData] = useState({
    password: '',
    confirmPassword: ''
  });

  const isClient = user?.role === 'Client';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (isClient) {
          const res = await api.get('/portal/profile');
          setProfileData({
            ...profileData,
            full_name: res.data.full_name || '',
            cnic: res.data.cnic || '',
            whatsapp_number: res.data.whatsapp_number || '',
            portal_username: res.data.portal_username || '',
            address: res.data.address || '',
            profile_image: res.data.profile_image || ''
          });
          if (res.data.profile_image) setPreviewImage(`http://localhost:5000/api/uploads/profiles/${res.data.profile_image}`);
          
          // Sync context in case it's missing profile_image from an old session
          if (!user?.profile_image && res.data.profile_image) {
            updateUser({ profile_image: res.data.profile_image });
          }
        } else {
          const res = await api.get(`/users/profile`);
          setProfileData({
            ...profileData,
            name: res.data.name || '',
            email: res.data.email || '',
            username: res.data.username || '',
            address: res.data.address || '',
            profile_image: res.data.profile_image || ''
          });
          if (res.data.profile_image) setPreviewImage(`http://localhost:5000/api/uploads/profiles/${res.data.profile_image}`);
          
          // Sync context in case it's missing profile_image from an old session
          if ((!user?.profile_image && res.data.profile_image) || user?.name !== res.data.name) {
            updateUser({ 
              name: res.data.name,
              profile_image: res.data.profile_image 
            });
          }
        }
      } catch (error) {
        toast.error('Failed to load profile data');
      }
    };
    if (user?.id) fetchProfile();
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSecurityData({ ...securityData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData();
    formData.append('address', profileData.address);
    if (selectedFile) formData.append('profile_image', selectedFile);

    if (isClient) {
      formData.append('full_name', profileData.full_name);
      formData.append('cnic', profileData.cnic);
      formData.append('whatsapp_number', profileData.whatsapp_number);
      formData.append('portal_username', profileData.portal_username);
    } else {
      formData.append('name', profileData.name);
      formData.append('email', profileData.email);
      formData.append('username', profileData.username);
    }

    try {
      let response;
      if (isClient) {
        response = await api.put('/portal/profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        updateUser({
          name: profileData.full_name,
          profile_image: response.data.profile_image || user?.profile_image
        });
      } else {
        response = await api.put('/users/profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        updateUser({
          name: profileData.name,
          profile_image: response.data.profile_image || user?.profile_image
        });
      }
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const saveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityData.password) {
      toast.error('Password cannot be empty');
      return;
    }
    if (securityData.password !== securityData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (isClient) {
        formData.append('full_name', profileData.full_name);
        formData.append('portal_password', securityData.password);
        await api.put('/portal/profile', formData);
      } else {
        formData.append('name', profileData.name);
        formData.append('password', securityData.password);
        await api.put('/users/profile', formData);
      }
      toast.success('Password updated successfully.');
      setSecurityData({ password: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center mb-6">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Account Settings
        </h2>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-4 px-6 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="inline-block w-4 h-4 mr-2" />
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-4 px-6 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'security' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="inline-block w-4 h-4 mr-2" />
            Security
          </button>
        </div>

        <div className="p-6 md:p-8">
          {activeTab === 'profile' ? (
            <form onSubmit={saveProfile} className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8 border-b border-gray-100 pb-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center relative">
                    {previewImage ? (
                      <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-12 h-12 text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
                  <p className="text-sm text-gray-500 mb-2">Upload a high-quality picture. JPG or PNG under 5MB.</p>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                    Upload new image
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h3>
              
              {isClient ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input required type="text" name="full_name" value={profileData.full_name} onChange={handleProfileChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
                    <input required type="text" name="cnic" value={profileData.cnic} onChange={handleProfileChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                    <input required type="text" name="whatsapp_number" value={profileData.whatsapp_number} onChange={handleProfileChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Portal Username</label>
                    <input required type="text" name="portal_username" value={profileData.portal_username} onChange={handleProfileChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                    <textarea name="address" value={profileData.address} onChange={handleProfileChange} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400" placeholder="Enter full address" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input required type="text" name="name" value={profileData.name} onChange={handleProfileChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input type="email" name="email" value={profileData.email} onChange={handleProfileChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input type="text" name="username" value={profileData.username} onChange={handleProfileChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                    <textarea name="address" value={profileData.address} onChange={handleProfileChange} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400" placeholder="Enter full address" />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={loading} className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 transition-all">
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={saveSecurity} className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Password</h3>
              
              <div className="grid grid-cols-1 gap-6 md:max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input required type="password" name="password" value={securityData.password} onChange={handleSecurityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="Enter new password" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input required type="password" name="confirmPassword" value={securityData.confirmPassword} onChange={handleSecurityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="Confirm new password" />
                </div>
              </div>

              <div className="pt-4 flex justify-start">
                <button type="submit" disabled={loading} className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 transition-all">
                  <Shield className="w-4 h-4 mr-2" />
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
