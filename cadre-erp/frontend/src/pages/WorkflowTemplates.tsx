import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Layout, ListChecks, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';
import api from '../utils/api';

const WorkflowTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', steps: [{ title: '', description: '', order_index: 0 }] });

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/projects/templates/list');
      setTemplates(res.data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAddStep = () => {
    setNewTemplate({
      ...newTemplate,
      steps: [...newTemplate.steps, { title: '', description: '', order_index: newTemplate.steps.length }]
    });
  };

  const handleRemoveStep = (idx: number) => {
    const steps = newTemplate.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order_index: i }));
    setNewTemplate({ ...newTemplate, steps });
  };

  const handleStepChange = (idx: number, field: string, val: string) => {
    const steps = [...newTemplate.steps];
    (steps[idx] as any)[field] = val;
    setNewTemplate({ ...newTemplate, steps });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/projects/templates', newTemplate);
      toast.success('Template created!');
      setIsModalOpen(false);
      setNewTemplate({ name: '', description: '', steps: [{ title: '', description: '', order_index: 0 }] });
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`/projects/templates/${id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Workflow Templates</h2>
          <p className="text-gray-500 font-medium">Standardize your project delivery processes.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={20} /> Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(t => (
          <div key={t.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Layout size={24} />
              </div>
              <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={18} />
              </button>
            </div>
            <h3 className="text-xl font-black text-gray-900">{t.name}</h3>
            <p className="text-sm text-gray-500 font-medium mt-2 mb-6 line-clamp-2">{t.description || 'No description provided.'}</p>
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <span className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
                <ListChecks size={14} /> {t.step_count} Steps
              </span>
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Global Template</span>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100">
              <Dialog.Title className="text-2xl font-black text-gray-900">Create Workflow Blueprint</Dialog.Title>
              <p className="text-gray-500 font-medium text-sm">Define a sequence of steps for this service type.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Template Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newTemplate.name} 
                    onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} 
                    placeholder="e.g. NTN Registration"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                  <input 
                    type="text" 
                    value={newTemplate.description} 
                    onChange={e => setNewTemplate({...newTemplate, description: e.target.value})} 
                    placeholder="Brief overview..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Workflow Sequence</h4>
                  <button type="button" onClick={handleAddStep} className="text-xs font-black text-indigo-600 hover:underline">+ Add Step</button>
                </div>
                
                <div className="space-y-4">
                  {newTemplate.steps.map((step, idx) => (
                    <div key={idx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 relative group/step">
                      <div className="grid gap-4">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-gray-400 border border-gray-100 text-xs">{idx + 1}</span>
                          <input 
                            required
                            type="text"
                            placeholder="Step Title"
                            value={step.title}
                            onChange={e => handleStepChange(idx, 'title', e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none font-black text-gray-900 placeholder:text-gray-300"
                          />
                          {newTemplate.steps.length > 1 && (
                            <button type="button" onClick={() => handleRemoveStep(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <textarea 
                          placeholder="Step instructions or details..."
                          value={step.description}
                          onChange={e => handleStepChange(idx, 'description', e.target.value)}
                          className="w-full bg-white border border-gray-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-black text-gray-500 hover:text-gray-700">Cancel</button>
              <button 
                onClick={handleSubmit}
                type="button"
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
              >
                Save Template
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default WorkflowTemplates;
