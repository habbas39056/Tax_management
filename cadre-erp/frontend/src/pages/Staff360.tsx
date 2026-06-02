import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ArrowLeft, User, Briefcase, Users, Activity } from 'lucide-react';
import clsx from 'clsx';

export default function Staff360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [staff, setStaff] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [assignedClients, setAssignedClients] = useState<any[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: '', email: '', username: '', password: '', role_id: '', commission_percentage: 0, is_active: 1
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, rolesRes, assignRes, activityRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get('/users/roles'),
        api.get(`/users/${id}/assignments`),
        api.get(`/users/${id}/activity`)
      ]);

      setStaff(staffRes.data);
      setRoles(rolesRes.data);
      
      setFormData({
        name: staffRes.data.name || '',
        email: staffRes.data.email || '',
        username: staffRes.data.username || '',
        password: '',
        role_id: staffRes.data.role_id || '',
        commission_percentage: staffRes.data.commission_percentage || 0,
        is_active: staffRes.data.is_active ? 1 : 0
      });

      setAssignedClients(assignRes.data.clients || []);
      setAssignedProjects(assignRes.data.assignedSteps || []);
      setActivities(activityRes.data || []);

    } catch (error) {
      console.error('Failed to load staff 360 data', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/users/${id}`, formData);
      toast.success('Staff updated successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update staff');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Staff 360 View...</div>;
  if (!staff) return <div className="p-8 text-center text-gray-500">Staff member not found.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/staff')} className="p-2 text-gray-400 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{staff.name}</h1>
          <p className="text-sm font-medium text-gray-500">Staff 360 View &bull; {staff.role_name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'profile', icon: User, label: 'Profile Settings' },
          { id: 'clients', icon: Users, label: 'Assigned Clients' },
          { id: 'projects', icon: Briefcase, label: 'Assigned Projects' },
          { id: 'activity', icon: Activity, label: 'Activity Log' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex-1 justify-center gap-2",
              activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdate} className="space-y-6 max-w-3xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Staff Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">System Username</label>
                <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password (leave blank to keep current)</label>
                <input type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Enter new password" />
              </div>
              
              {user?.role === 'Super Admin' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assigned Role</label>
                    <select value={formData.role_id} onChange={e => setFormData({...formData, role_id: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                      <option value="">Select Role</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Commission Rate (%)</label>
                    <input type="number" step="0.01" value={formData.commission_percentage} onChange={e => setFormData({...formData, commission_percentage: parseFloat(e.target.value)})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Status</label>
                    <select value={formData.is_active} onChange={e => setFormData({...formData, is_active: parseInt(e.target.value)})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                Save Changes
              </button>
            </div>
          </form>
        )}

        {activeTab === 'clients' && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Assigned Clients</h3>
            {assignedClients.length === 0 ? <p className="text-sm text-gray-500">No clients assigned.</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedClients.map(c => (
                  <div key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="p-4 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer transition-colors">
                    <div className="font-bold text-gray-900 text-sm">{c.full_name}</div>
                    <div className="text-xs text-gray-500 mt-1">CNIC: {c.cnic} | WA: {c.whatsapp_number}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Assigned Active Steps</h3>
            {assignedProjects.length === 0 ? <p className="text-sm text-gray-500">No projects or steps assigned.</p> : (
              <div className="space-y-3">
                {assignedProjects.map(s => (
                  <div key={s.step_id} onClick={() => navigate(`/projects/${s.project_id}`)} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer transition-colors">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{s.project_title} &bull; {s.step_title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Client: {s.client_name}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg uppercase tracking-wider">{s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
            {activities.length === 0 ? <p className="text-sm text-gray-500">No recent activity.</p> : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {activities.map(act => (
                  <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-indigo-100 text-indigo-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-900 capitalize">{act.action}</span>
                        <span className="text-[10px] font-semibold text-gray-400">{new Date(act.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-gray-600">{act.details}</div>
                      {(act.project_title || act.step_title) && (
                        <div className="mt-2 text-[10px] text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded-md font-semibold">
                          {act.project_title} {act.step_title ? ` > ${act.step_title}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
