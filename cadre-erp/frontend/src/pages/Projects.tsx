import React, { useState, useEffect } from 'react';
import { Plus, Folder, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface ProjectStep {
  title: string;
  status: string;
  order_index: number;
}

interface Project {
  id: string;
  title: string;
  status: string;
  client_name: string;
  service_name: string;
  total_steps: number;
  completed_steps: number;
  completion_percentage: number;
  steps?: ProjectStep[];
}

const Projects: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  const [formData, setFormData] = useState({ client_id: '', service_id: '', title: '', invoice_id: '' });

  const fetchData = async () => {
    try {
      if (user?.role === 'Client') {
        // Clients only need to see their projects, not the full list of other clients/services
        const projRes = await api.get('/projects');
        setProjects(projRes.data);
      } else {
        const [projRes, clientRes, servRes, invRes] = await Promise.all([
          api.get('/projects'),
          api.get('/clients'),
          api.get('/projects/services'),
          api.get('/finance/invoices')
        ]);
        setProjects(projRes.data);
        setClients(clientRes.data);
        setServices(servRes.data);
        setInvoices(invRes.data);
      }
    } catch (error) {
      toast.error('Failed to load project data');
    }
  };

  useEffect(() => {
    fetchData();
    const query = new URLSearchParams(window.location.search);
    if (query.get('new') === 'true') {
      setIsModalOpen(true);
      window.history.replaceState({}, '', '/projects');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/projects', formData);
      toast.success('Project created successfully!');
      setIsModalOpen(false);
      setFormData({ client_id: '', service_id: '', title: '', invoice_id: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || p.status === statusFilter;
    const matchesService = !serviceFilter || p.service_name === serviceFilter;
    return matchesSearch && matchesStatus && matchesService;
  });

  const uniqueServices = Array.from(new Set(projects.map(p => p.service_name).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Project Management
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 mt-4 text-sm font-medium text-white bg-indigo-600 rounded-md sm:mt-0 hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2 -ml-1" />
          Create Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by title or client name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="w-full md:w-44">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="w-full md:w-48">
            <select
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
            >
              <option value="">All Services</option>
              {uniqueServices.map(svc => (
                <option key={svc} value={svc}>{svc}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500">No projects found matching the filters.</div>
        ) : (
          filteredProjects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="block">
              <div className="overflow-hidden transition-all duration-200 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-500/50">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Folder className="w-5 h-5" />
                    </div>
                    <h3 className="ml-3 text-base font-bold text-gray-900 truncate">{project.title}</h3>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    <p className="text-sm text-gray-500"><span className="font-semibold text-gray-700">Client:</span> {project.client_name}</p>
                    <p className="text-sm text-gray-500"><span className="font-semibold text-gray-700">Service:</span> {project.service_name}</p>
                  </div>
                  
                  {/* Progress section */}
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                      <span>Progress</span>
                      <span>{project.completed_steps}/{project.total_steps} Steps ({project.completion_percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${project.completion_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {project.steps && project.steps.length > 0 && (
                    <div 
                      className="mt-4 max-h-28 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {project.steps.map((step, idx) => {
                        let dotColor = 'bg-gray-300';
                        if (step.status === 'Completed') dotColor = 'bg-green-500';
                        else if (step.status === 'In Progress') dotColor = 'bg-indigo-500 animate-pulse';
                        else if (step.status === 'Pending') dotColor = 'bg-yellow-400';
                        else if (step.status === 'Rejected') dotColor = 'bg-red-500';
                        
                        return (
                          <div key={idx} className="flex items-center text-xs">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 mr-2 ${dotColor}`}></div>
                            <span className={`truncate ${step.status === 'Completed' ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                              {step.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize
                      ${project.status === 'active' ? 'bg-green-50 text-green-700' : 
                        project.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-xl shadow-2xl">
            <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">Create New Project</Dialog.Title>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Title</label>
                <input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client</label>
                <select required value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value, invoice_id: ''})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md sm:text-sm">
                  <option value="">Select a client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              {formData.client_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Link Invoice *</label>
                  <select required value={formData.invoice_id} onChange={(e) => setFormData({...formData, invoice_id: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-indigo-200 bg-indigo-50 rounded-md sm:text-sm font-bold">
                    <option value="">Select Invoice</option>
                    {invoices
                      .filter(inv => inv.client_id === formData.client_id)
                      .map(inv => (
                        <option key={inv.id} value={inv.id}>
                          INV-{inv.id.slice(0,8)} · Rs. {Number(inv.total_amount).toLocaleString()} ({inv.status})
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-[10px] text-indigo-500 font-medium">Projects must be linked to an invoice first.</p>
                </div>
              )}
               <div>
                <label className="block text-sm font-medium text-gray-700">Service</label>
                <select required value={formData.service_id} onChange={(e) => setFormData({...formData, service_id: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md sm:text-sm">
                  <option value="">Select a service</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end pt-4 space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md">Create</button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default Projects;
