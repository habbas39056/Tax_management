import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const AVAILABLE_MODULES = ['Dashboard', 'Invoices', 'Clients', 'Projects', 'Staff Management', 'Reports', 'AI Tools'];

const Staff: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
    commission_percentage: '0',
    module_access: [] as string[]
  });

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch staff data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        username: formData.email.split('@')[0] // auto-generate username
      };
      await api.post('/users', payload);
      toast.success('Employee created successfully!');
      setFormData({ name: '', email: '', password: '', role_id: '', commission_percentage: '0', module_access: [] });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 bg-[#F8FAFC] min-h-screen -mx-8 -mt-8 pt-8">
      {/* Top Form Container */}
      <div className="bg-white p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border-b border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Name *</label>
              <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Email *</label>
              <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Password *</label>
              <input required type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Role</label>
              <select required name="role_id" value={formData.role_id} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white transition-colors appearance-none">
                <option value="">Employee</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          {roles.find(r => r.id === formData.role_id)?.name === 'Sales' && (
            <div className="w-1/4">
              <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">Commission Percentage (%) *</label>
              <input required type="number" name="commission_percentage" value={formData.commission_percentage} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-bold text-indigo-900 outline-none focus:border-indigo-500 focus:bg-white transition-colors" />
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Modules Access</label>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 p-5 bg-gray-50/50 border border-gray-100 rounded-xl">
              {AVAILABLE_MODULES.map(module => (
                <label key={module} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="peer appearance-none w-4 h-4 border-2 border-gray-300 rounded focus:ring-0 checked:bg-indigo-600 checked:border-indigo-600 transition-colors cursor-pointer"
                      checked={formData.module_access.includes(module)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({...prev, module_access: [...prev.module_access, module]}));
                        } else {
                          setFormData(prev => ({...prev, module_access: prev.module_access.filter(m => m !== module)}));
                        }
                      }}
                    />
                    <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">{module}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50">
              <span className="mr-2 text-lg leading-none">+</span> Create Employee
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Table Container */}
      <div className="max-w-7xl mx-auto px-8 pt-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-black text-gray-900">Existing Employees</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Access</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm font-medium">No employees found.</td>
                </tr>
              ) : (
                users.map(user => {
                  const accessList = typeof user.module_access === 'string' ? JSON.parse(user.module_access) : (user.module_access || []);
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">{user.role_name}</td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {accessList.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {accessList.map((mod: string) => (
                              <span key={mod} className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[10px] tracking-widest">{mod}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300">NONE</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link to={`/staff/${user.id}`} className="inline-flex items-center justify-center p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Pencil size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Staff;
