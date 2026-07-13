import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { User, Shield, Save, Upload, UserCircle, Eye, EyeOff } from 'lucide-react';

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'services'>('profile');
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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Services State
  const [services, setServices] = useState<{id: string, name: string}[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [loadingServices, setLoadingServices] = useState(false);

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
          if (res.data.profile_image) setPreviewImage(`/uploads/profiles/${res.data.profile_image}`);
          
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
          if (res.data.profile_image) setPreviewImage(`/uploads/profiles/${res.data.profile_image}`);
          
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

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const res = await api.get('/projects/services');
      setServices(res.data);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'services' && !isClient) {
      fetchServices();
    }
  }, [activeTab, isClient]);

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
        response = await api.put('/portal/profile', formData);
        updateUser({
          name: profileData.full_name,
          profile_image: response.data.profile_image || user?.profile_image
        });
      } else {
        response = await api.put('/users/profile', formData);
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

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    
    try {
      setLoading(true);
      await api.post('/projects/services', { name: newServiceName });
      toast.success('Service added successfully');
      setNewServiceName('');
      fetchServices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error adding service');
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
          {!isClient && (
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 py-4 px-6 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'services' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Save className="inline-block w-4 h-4 mr-2" />
              Services
            </button>
          )}
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
          ) : activeTab === 'security' ? (
            <form onSubmit={saveSecurity} className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Password</h3>
              
              <div className="grid grid-cols-1 gap-6 md:max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input required type={showPassword ? "text" : "password"} name="password" value={securityData.password} onChange={handleSecurityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all pr-10" placeholder="Enter new password" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input required type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={securityData.confirmPassword} onChange={handleSecurityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all pr-10" placeholder="Confirm new password" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-start">
                <button type="submit" disabled={loading} className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 transition-all">
                  <Shield className="w-4 h-4 mr-2" />
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          ) : activeTab === 'services' && !isClient ? (
            <div className="space-y-8">
              <form onSubmit={handleAddService} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Service</h3>
                <div className="flex gap-4">
                  <input
                    required
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="Enter service name (e.g. Audit, Tax Filing)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !newServiceName.trim()}
                    className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Adding...' : 'Add Service'}
                  </button>
                </div>
              </form>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Services</h3>
                {loadingServices ? (
                  <p className="text-gray-500">Loading services...</p>
                ) : services.length === 0 ? (
                  <p className="text-gray-500 italic">No services added yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden">
                    {services.map(service => (
                      <li key={service.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <span className="font-medium text-gray-900">{service.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Settings;
