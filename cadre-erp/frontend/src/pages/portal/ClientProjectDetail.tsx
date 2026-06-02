import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { ArrowLeft, CheckCircle2, Clock, Loader2, Download, FileText, MessageSquare, AlertCircle, Calendar, User, Activity, Upload, Send, Briefcase, CreditCard, Trash2, Pencil, X } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

const ClientProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [showInvoiceEditModal, setShowInvoiceEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  const fetchProject = async () => {
    if (!id) return;
    try {
      const r = await api.get(`/portal/projects/${id}`);
      setProject(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleFieldFileUpload = async (stepId: string, fieldId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('field_id', fieldId);
    
    try {
      await api.post(`/portal/projects/steps/${stepId}/fields/upload`, fd);
      toast.success('File uploaded successfully!');
      fetchProject();
    } catch (e) {
      toast.error('Failed to upload file');
    }
  };

  const handleSubmitFields = async (stepId: string, fields: any[]) => {
    // Collect values first
    const values: Record<string, any> = {};
    const emptyFields: string[] = [];

    fields.forEach(f => {
      if (f.field_type === 'file') return; // file fields handled separately
      const input = document.getElementById(`field-${stepId}-${f.config_id}`) as HTMLInputElement;
      if (input) {
        const val = input.type === 'checkbox' ? input.checked : input.value;
        if (!val && val !== false) {
          emptyFields.push(f.label);
        } else {
          values[f.config_id] = val;
        }
      }
    });

    // Validate: no empty fields allowed
    if (emptyFields.length > 0) {
      toast.error(`Please fill in: ${emptyFields.join(', ')}`);
      return;
    }

    if (Object.keys(values).length === 0) {
      toast.error('No fields to submit. Please fill in the required details.');
      return;
    }

    setSubmitting(p => ({ ...p, [stepId]: true }));
    try {
      await api.post(`/portal/projects/steps/${stepId}/fields`, { values });
      toast.success('Information submitted successfully!');
      fetchProject();
    } catch (e) {
      toast.error('Failed to submit information');
    } finally {
      setSubmitting(p => ({ ...p, [stepId]: false }));
    }
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const subtotal = editingInvoice.items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);
      const afterDiscount = subtotal - (editingInvoice.discount || 0);
      const gst = (afterDiscount * (editingInvoice.gst_rate || 0)) / 100;
      const total = afterDiscount + gst;

      const payload = {
        ...editingInvoice,
        service_charges_total: subtotal,
        other_charges_total: (total - subtotal),
        total_amount: total
      };

      await api.put(`/finance/invoices/${editingInvoice.id}`, payload);
      toast.success('Invoice updated successfully');
      setShowInvoiceEditModal(false);
      fetchProject();
    } catch (e) {
      toast.error('Failed to update invoice');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-gray-500 font-black text-xs uppercase tracking-widest">Loading your workspace...</p>
      </div>
    </div>
  );

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-12 rounded-[40px] shadow-xl text-center max-w-md border border-gray-100">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Project Not Found</h2>
        <p className="text-gray-500 font-medium mb-8">We couldn't locate the project you're looking for. It might have been moved or archived.</p>
        <button onClick={() => navigate('/portal/projects')} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
          Go Back to Portal
        </button>
      </div>
    </div>
  );

  const completedSteps = (project.steps || []).filter((s: any) => s.status === 'Completed').length;
  const totalSteps = (project.steps || []).length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Premium Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 px-6 py-6 sm:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/portal/projects')} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Briefcase size={16} className="text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[2px]">Project Workspace</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{project.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-gray-50 px-6 py-3 rounded-3xl border border-gray-100">
            <div className="text-right">
              <div className="text-sm font-black text-indigo-600">{progress}% Complete</div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{completedSteps} of {totalSteps} Milestones</div>
            </div>
            <div className="w-24 sm:w-32 bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(79,70,229,0.4)]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Timeline Section */}
          <div className="relative">
            <div className="absolute left-6 top-8 bottom-8 w-1 bg-gray-100 rounded-full" />
            <h2 className="text-xl font-black text-gray-900 mb-8 ml-2 flex items-center justify-between">
              Milestones & Journey
              <span className="text-[10px] text-gray-300 uppercase tracking-[2px]">{totalSteps} Steps Total</span>
            </h2>

            {(project.steps || []).map((step: any, idx: number) => (
              <div key={step.id} className="relative pl-20 mb-12 last:mb-0 group">
                <div className={clsx(
                  "absolute left-2.5 top-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all z-10 shadow-lg",
                  step.status === 'Completed' ? "bg-emerald-500 text-white shadow-emerald-100" : "bg-white text-gray-400 border-2 border-gray-100"
                )}>
                  {step.status === 'Completed' ? <CheckCircle2 size={16} /> : idx + 1}
                </div>

                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 transition-all hover:shadow-md hover:border-indigo-100">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">{step.title}</h3>
                      <span className={clsx(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        step.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"
                      )}>
                        {step.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-500 font-medium leading-relaxed text-sm mb-4">{step.description || 'Step details are being finalized.'}</p>
                  
                  <div className="flex flex-wrap gap-4 mb-6">
                    {step.due_date && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
                        <Calendar size={14} className="text-gray-400" />
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider leading-none">Expected By</p>
                          <p className="text-xs font-bold text-gray-700">{new Date(step.due_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                    {step.follow_up_sent_at && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100 animate-pulse">
                        <MessageSquare size={14} className="text-indigo-600" />
                        <div>
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider leading-none">Status</p>
                          <p className="text-xs font-bold text-indigo-700">Follow-up Sent</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {step.status === 'Rejected' && step.rejection_reason && (
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6 flex gap-3">
                      <AlertCircle size={20} className="text-red-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Correction Required</p>
                        <p className="text-sm font-bold text-red-700">{step.rejection_reason}</p>
                      </div>
                    </div>
                  )}

                  {/* Requirement Alerts */}
                  <div className="flex flex-col gap-3 mb-8">
                    {!!step.needs_fields && (!step.fields || step.fields.every((f:any) => !f.field_value)) && step.status !== 'Completed' && (
                      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3 items-center">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-indigo-900">Form Submission Required</p>
                          <p className="text-xs text-indigo-600 font-medium opacity-80">Please fill out the details below to proceed.</p>
                        </div>
                      </div>
                    )}
                    {!!step.needs_payment && step.invoices?.some((inv: any) => inv.status !== 'paid') && step.status !== 'Completed' && (
                      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex gap-3 items-center">
                        <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-100">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-emerald-900">Payment Required</p>
                          <p className="text-xs text-emerald-600 font-medium opacity-80">One or more invoices need settlement for this milestone.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Area: Fields to fill */}
                  {!!step.needs_fields && !!step.fields?.length && (
                    <div className="mt-8 pt-8 border-t border-gray-50 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px]">Action Required: Information Form</h4>
                        {step.status !== 'Completed' && step.fields.some((f: any) => f.field_type !== 'file') && (
                          <button 
                            onClick={() => handleSubmitFields(step.id, step.fields)}
                            disabled={submitting[step.id]}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-colors disabled:opacity-50"
                          >
                            {submitting[step.id] ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            SUBMIT DETAILS
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {step.fields.map((field: any, i: number) => (
                          <div key={`${step.id}-${field.config_id}`} className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{field.label}</label>
                            {field.field_type === 'select' ? (
                              <select 
                                id={`field-${step.id}-${field.config_id}`}
                                defaultValue={field.field_value}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                              >
                                <option value="">Select Option</option>
                                {JSON.parse(field.options || '[]').map((opt: string) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : field.field_type === 'file' ? (
                              <div className="space-y-3">
                                {field.field_value ? (
                                  <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center">
                                        <FileText size={18} />
                                      </div>
                                      <div>
                                        <p className="text-xs font-black text-emerald-900 uppercase tracking-widest">Document Received</p>
                                        <p className="text-[10px] text-emerald-600 font-bold">{field.field_value.split('/').pop()}</p>
                                      </div>
                                    </div>
                                    <a href={`http://localhost:5000/api/uploads/steps/${field.field_value}`} target="_blank" rel="noreferrer" 
                                      className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg">
                                      <Download size={16} />
                                    </a>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <input 
                                      type="file" 
                                      onChange={(e) => e.target.files?.[0] && handleFieldFileUpload(step.id, field.config_id, e.target.files[0])}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                    />
                                    <div className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-100 rounded-2xl hover:border-indigo-200 transition-all">
                                      <Upload size={18} className="text-gray-400" />
                                      <span className="text-xs font-bold text-gray-400">Click to upload {field.label}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input 
                                id={`field-${step.id}-${field.config_id}`}
                                type={field.field_type}
                                defaultValue={field.field_value}
                                placeholder={`Enter ${field.label}...`}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Area: Payment & Invoicing */}
                  {!!step.needs_payment && (
                    <div className="mt-8 pt-8 border-t border-gray-50 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px]">Action Required: Payment & Invoices</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {step.invoices?.length > 0 ? step.invoices.map((inv: any) => (
                          <div key={inv.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:border-indigo-100 hover:shadow-md">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                <CreditCard size={20} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-gray-900 uppercase">INV-{inv.id?.slice(0, 8)}</span>
                                  <span className={clsx(
                                    "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                                    inv.status === 'paid' ? "bg-emerald-100 text-emerald-600" : "bg-yellow-100 text-yellow-600"
                                  )}>
                                    {inv.status}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-indigo-600 mt-1">Rs. {Number(inv.total_amount).toLocaleString()}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                let items = [];
                                try { items = inv.items ? JSON.parse(inv.items) : []; } catch (e) { items = []; }
                                if (items.length === 0) {
                                  items = [{ description: inv.description || 'Service', quantity: 1, price: inv.service_charges_total || 0 }];
                                }
                                setEditingInvoice({ ...inv, items });
                                setShowInvoiceEditModal(true);
                              }}
                              className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-100 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                        )) : (
                          <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-3xl">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[2px]">No invoices linked to this milestone</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* Communications Card */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
             <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
               <MessageSquare size={20} className="text-indigo-600" /> Communications
             </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {(() => {
                  const allComments = (project.steps || []).flatMap((s: any) => s.comments || []);
                  if (allComments.length === 0) return <p className="text-[10px] font-bold text-gray-300 uppercase italic text-center py-8">No shared notes yet</p>;
                  
                  return allComments.map((c: any, i: number) => (
                    <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                      <span className="text-indigo-600">{c.user_name}</span>
                      <span className="text-gray-300">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl text-xs font-medium text-gray-700 leading-relaxed border border-gray-50">
                      {c.content}
                    </div>
                  </div>
                  ));
                })()}
              </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
             <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
               <Activity size={20} className="text-indigo-600" /> Recent Activity
             </h3>
              <div className="space-y-4 border-l-2 border-gray-50 pl-6 ml-1">
                {(() => {
                  const allLogs = (project.steps || []).flatMap((s: any) => s.activity_logs || [])
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5);
                    
                  return allLogs.map((log: any, i: number) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-gray-200 border-2 border-white" />
                      <div className="text-[9px] font-bold text-gray-400 mb-1">{new Date(log.created_at).toLocaleString()}</div>
                      <p className="text-xs font-bold text-gray-900 leading-tight">{log.action}</p>
                      {log.details && <p className="text-[10px] text-gray-500 mt-0.5">{log.details}</p>}
                    </div>
                  ));
                })()}
              </div>
          </div>
        </div>
      </div>

      {/* Edit Invoice Modal for Client */}
      <Dialog open={showInvoiceEditModal} onClose={() => setShowInvoiceEditModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <Dialog.Title className="text-2xl font-black text-gray-900">Review & Adjust Invoice</Dialog.Title>
              <button onClick={() => setShowInvoiceEditModal(false)} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500"><X size={20} /></button>
            </div>

            {editingInvoice && (
              <form onSubmit={handleUpdateInvoice} className="space-y-8 overflow-y-auto pr-4 custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">GST Rate (%)</label>
                    <input type="number" value={editingInvoice.gst_rate} onChange={e => setEditingInvoice({ ...editingInvoice, gst_rate: Number(e.target.value) })}
                      className="w-full mt-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black focus:ring-2 focus:ring-indigo-600 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Discount (Rs)</label>
                    <input type="number" value={editingInvoice.discount} onChange={e => setEditingInvoice({ ...editingInvoice, discount: Number(e.target.value) })}
                      className="w-full mt-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black focus:ring-2 focus:ring-indigo-600 outline-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Service Items</h4>
                    <button type="button" onClick={() => setEditingInvoice({ ...editingInvoice, items: [...editingInvoice.items, { description: '', quantity: 1, price: 0 }] })}
                      className="text-[10px] font-black text-indigo-600 hover:underline">+ ADD CUSTOM ITEM</button>
                  </div>
                  {editingInvoice.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 items-end bg-gray-50 p-4 rounded-2xl group relative border border-gray-100">
                      <div className="flex-1">
                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Description</label>
                        <input value={item.description} onChange={e => {
                          const newItems = [...editingInvoice.items];
                          newItems[idx].description = e.target.value;
                          setEditingInvoice({ ...editingInvoice, items: newItems });
                        }} className="w-full mt-1 px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none" />
                      </div>
                      <div className="w-16">
                        <label className="text-[9px] text-gray-400 uppercase font-black text-center block tracking-widest">Qty</label>
                        <input type="number" value={item.quantity} onChange={e => {
                          const newItems = [...editingInvoice.items];
                          newItems[idx].quantity = Number(e.target.value);
                          setEditingInvoice({ ...editingInvoice, items: newItems });
                        }} className="w-full mt-1 px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-center outline-none" />
                      </div>
                      <div className="w-28">
                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Price</label>
                        <input type="number" value={item.price} onChange={e => {
                          const newItems = [...editingInvoice.items];
                          newItems[idx].price = Number(e.target.value);
                          setEditingInvoice({ ...editingInvoice, items: newItems });
                        }} className="w-full mt-1 px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none" />
                      </div>
                      <button type="button" onClick={() => {
                        const newItems = editingInvoice.items.filter((_: any, i: number) => i !== idx);
                        setEditingInvoice({ ...editingInvoice, items: newItems });
                      }} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t border-gray-100 space-y-3">
                  <div className="flex justify-between text-xs font-black text-gray-400 px-2 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>Rs. {editingInvoice.items.reduce((s: number, i: any) => s + (i.quantity * i.price), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-red-400 px-2 uppercase tracking-widest">
                    <span>Discount</span>
                    <span>- Rs. {(editingInvoice.discount || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-gray-900 text-white p-6 rounded-[32px] flex justify-between items-center shadow-xl shadow-gray-200 mt-6">
                    <div>
                      <span className="text-[10px] font-black uppercase opacity-60 tracking-[2px]">Final Amount</span>
                      <p className="text-[10px] text-gray-400 font-bold mt-1">Includes GST & Adjustments</p>
                    </div>
                    <span className="text-3xl font-black">
                      Rs. {(
                        (editingInvoice.items.reduce((s: number, i: any) => s + (i.quantity * i.price), 0) - (editingInvoice.discount || 0)) * (1 + (editingInvoice.gst_rate || 0) / 100)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 pb-4">
                  <button type="button" onClick={() => setShowInvoiceEditModal(false)} className="px-8 py-4 text-sm font-black text-gray-500 hover:text-gray-700">Cancel</button>
                  <button type="submit" className="px-10 py-4 bg-indigo-600 text-white rounded-[20px] text-sm font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all">
                    CONFIRM & SAVE
                  </button>
                </div>
              </form>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default ClientProjectDetail;
