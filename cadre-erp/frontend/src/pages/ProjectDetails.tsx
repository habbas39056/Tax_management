import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronDown, ChevronUp, Trash2, Upload, FileText, Download, MessageSquare, Link2, Loader2, Calendar, AlertCircle, CheckCircle2, Clock, Pencil, X } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import clsx from 'clsx';

const STATUSES = ['Pending','In Progress','Completed','Rejected','On Hold','Cancelled'];
const PRIORITIES = ['Low','Medium','High','Urgent'];
const STATUS_COLORS: Record<string,string> = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Completed': 'bg-green-100 text-green-800',
  'Rejected': 'bg-red-100 text-red-800',
  'On Hold': 'bg-gray-100 text-gray-600',
  'Cancelled': 'bg-red-50 text-red-500',
};

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{id:string}>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  const [activeTab, setActiveTab] = useState<Record<string,string>>({});
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [showInvoiceEditModal, setShowInvoiceEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [activeStepId, setActiveStepId] = useState('');
  const [editingStep, setEditingStep] = useState<any>(null);
  const [uploadStepId, setUploadStepId] = useState('');
  const [commentText, setCommentText] = useState<Record<string,string>>({});
  const [linkInvoiceStep, setLinkInvoiceStep] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState('');


  const [fieldForm, setFieldForm] = useState({ label: '', field_type: 'text', options: '', required: false });

  const fetchProject = async () => {
    try {
      const [projRes, usersRes, invRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get('/users/staff').catch(() => ({ data: [] })),
        api.get('/finance/invoices').catch(() => ({ data: [] }))
      ]);
      setProject(projRes.data);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
    } catch { toast.error('Failed to load project'); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    if (id === 'new') {
      navigate('/projects?new=true', { replace: true });
      return;
    }
    if(id) fetchProject(); 
  }, [id, navigate]);

  const handleLinkInvoice = async () => {
    if (!selectedInvoice || !linkInvoiceStep) return;
    try {
      await api.post(`/projects/steps/${linkInvoiceStep}/invoices`, { invoice_id: selectedInvoice });
      toast.success('Invoice linked');
      setLinkInvoiceStep('');
      setSelectedInvoice('');
      fetchProject();
    } catch { toast.error('Failed to link invoice'); }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...fieldForm,
        options: fieldForm.options.split(',').map(o => o.trim()).filter(o => o),
        order_index: project.steps.find((s:any) => s.id === activeStepId)?.fields?.length || 0
      };
      await api.post(`/projects/steps/${activeStepId}/fields`, payload);
      toast.success('Field added');
      setShowFieldModal(false);
      setFieldForm({ label: '', field_type: 'text', options: '', required: false });
      fetchProject();
    } catch { toast.error('Failed to add field'); }
  };

  const handleSaveFieldValues = async (stepId: string, values: any) => {
    try {
      await api.post(`/projects/steps/${stepId}/values`, { values });
      toast.success('Values saved');
      fetchProject();
    } catch { toast.error('Failed to save values'); }
  };

  const moveStep = async (stepId: string, direction: 'up' | 'down') => {
    const steps = [...project.steps];
    const idx = steps.findIndex(s => s.id === stepId);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === steps.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    [steps[idx], steps[targetIdx]] = [steps[targetIdx], steps[idx]];

    try {
      await Promise.all(steps.map((s, i) => api.put(`/projects/steps/${s.id}`, { order_index: i })));
      fetchProject();
    } catch { toast.error('Failed to reorder'); }
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const subtotal = editingInvoice.items.reduce((sum:number, item:any) => sum + (item.quantity * item.price), 0);
      const afterDiscount = subtotal - editingInvoice.discount;
      const gst = (afterDiscount * editingInvoice.gst_rate) / 100;
      const total = afterDiscount + gst;

      const payload = {
        ...editingInvoice,
        service_charges_total: subtotal,
        other_charges_total: (total - subtotal),
        total_amount: total
      };

      await api.put(`/finance/invoices/${editingInvoice.id}`, payload);
      toast.success('Invoice updated');
      setShowInvoiceEditModal(false);
      fetchProject();
    } catch { toast.error('Failed to update invoice'); }
  };

  const progress = project?.steps?.length
    ? Math.round((project.steps.filter((s:any) => s.status==='Completed').length / project.steps.length)*100) : 0;

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Delete this step?')) return;
    try { await api.delete(`/projects/steps/${stepId}`); toast.success('Step deleted'); fetchProject(); }
    catch { toast.error('Failed to delete step'); }
  };

  const handleStatusChange = async (stepId: string, status: string) => {
    try { await api.put(`/projects/steps/${stepId}`, { status }); fetchProject(); }
    catch { toast.error('Failed to update status'); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !uploadStepId) return;
    const fd = new FormData();
    fd.append('file', e.target.files[0]);
    try { await api.post(`/projects/steps/${uploadStepId}/documents`, fd); toast.success('File uploaded'); fetchProject(); }
    catch { toast.error('Upload failed'); }
    finally { if(fileRef.current) fileRef.current.value = ''; setUploadStepId(''); }
  };

  const handleComment = async (stepId: string) => {
    const text = commentText[stepId]?.trim();
    if (!text) return;
    try {
      await api.post(`/projects/steps/${stepId}/comments`, { content: text, is_internal: false });
      setCommentText(p => ({...p, [stepId]: ''}));
      toast.success('Comment added');
      fetchProject();
    } catch { toast.error('Failed to add comment'); }
  };

  const openEdit = (step: any) => {
    navigate(`/projects/${id}/steps/${step.id}`);
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>;
  if (!project) return <div className="text-center p-20"><p className="text-red-500 font-bold">Project not found</p></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif" />

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 text-sm font-medium mb-4">
          <ArrowLeft size={16} /> Back to Projects
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Client: <span className="font-medium text-gray-700">{project.client_name}</span> · Service: <span className="font-medium text-gray-700">{project.service_name}</span></p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600">{progress}%</div>
              <div className="text-xs text-gray-400">Completion</div>
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-2.5">
              <div className="bg-indigo-600 h-2.5 rounded-full transition-all" style={{width:`${progress}%`}} />
            </div>
          </div>
        </div>
      </div>

      {/* Add Step Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Workflow Steps ({project.steps?.length || 0})</h2>
        <button onClick={() => navigate(`/projects/${id}/steps/new`)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all">
          <Plus size={16} /> Add Step
        </button>
      </div>

      {/* Steps List */}
      {project.steps?.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 font-medium">No steps yet. Click "Add Step" to create your first workflow step.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {project.steps.map((step: any, idx: number) => {
            const isOpen = expanded[step.id];
            const tab = activeTab[step.id] || 'details';
            return (
              <div key={step.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Step Header */}
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(p => ({...p, [step.id]: !isOpen}))}>
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-sm font-bold text-indigo-600">{idx+1}</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{step.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[step.status] || 'bg-gray-100 text-gray-600')}>{step.status}</span>
                        {step.due_date && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10} /> Due: {new Date(step.due_date).toLocaleDateString()}</span>}
                        {step.follow_up_sent_at && <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg flex items-center gap-1"><MessageSquare size={10} /> WhatsApp Follow-up Sent</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={step.status} onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); handleStatusChange(step.id, e.target.value); }}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={e => { e.stopPropagation(); moveStep(step.id, 'up'); }} className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30" disabled={idx === 0}><ChevronUp size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); moveStep(step.id, 'down'); }} className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30" disabled={idx === project.steps.length - 1}><ChevronDown size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); openEdit(step); }} className="p-1.5 text-gray-400 hover:text-indigo-600"><Pencil size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); handleDeleteStep(step.id); }} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 px-4">
                      {['details','fields','documents','comments','invoices','activity'].map(t => (
                        <button key={t} onClick={() => setActiveTab(p => ({...p, [step.id]: t}))}
                          className={clsx('px-4 py-2.5 text-xs font-medium capitalize border-b-2 transition-colors',
                            tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600')}>
                          {t}
                        </button>
                      ))}
                    </div>

                    <div className="p-5">
                      {/* Details Tab */}
                      {tab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div><span className="text-gray-400 font-medium">Description:</span><p className="text-gray-700 mt-1">{step.description || 'No description'}</p></div>
                          <div><span className="text-gray-400 font-medium">Assigned To:</span><p className="text-gray-700 mt-1">{step.assigned_user_name || 'Unassigned'}</p></div>
                          <div><span className="text-gray-400 font-medium">Due Date:</span><p className="text-gray-700 mt-1">{step.due_date ? new Date(step.due_date).toLocaleDateString() : 'Not set'}</p></div>
                          <div><span className="text-gray-400 font-medium">Created:</span><p className="text-gray-700 mt-1">{step.created_at ? new Date(step.created_at).toLocaleDateString() : '-'}</p></div>
                          {step.status === 'Rejected' && step.rejection_reason && (
                            <div className="col-span-2 bg-red-50 p-3 rounded-xl">
                              <span className="text-red-600 font-medium flex items-center gap-1"><AlertCircle size={14} /> Rejection Reason:</span>
                              <p className="text-red-700 mt-1">{step.rejection_reason}</p>
                            </div>
                          )}
                          {step.reminder_note && (
                            <div className="col-span-2 bg-yellow-50 p-3 rounded-xl">
                              <span className="text-yellow-700 font-medium">Reminder Note:</span>
                              <p className="text-yellow-800 mt-1">{step.reminder_note}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Fields Tab */}
                      {tab === 'fields' && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-gray-700">Requested Information</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {step.fields?.length > 0 ? step.fields.map((f: any) => (
                              <div key={f.id} className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                                {['text', 'number', 'tel', 'email'].includes(f.field_type) && <input id={`field-${f.id}`} type={f.field_type === 'text' ? 'text' : f.field_type} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" defaultValue={f.field_value} />}
                                {f.field_type === 'textarea' && <textarea id={`field-${f.id}`} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows={2} defaultValue={f.field_value} />}
                                {f.field_type === 'select' && (
                                  <select id={`field-${f.id}`} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" defaultValue={f.field_value}>
                                    <option value="">Select...</option>
                                    {f.options && JSON.parse(f.options).map((o: string) => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                )}
                                {f.field_type === 'date' && <input id={`field-${f.id}`} type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" defaultValue={f.field_value} />}
                                {f.field_type === 'checkbox' && <input id={`field-${f.id}`} type="checkbox" className="h-4 w-4 rounded border-gray-300" defaultChecked={f.field_value === 'true'} />}
                                {f.field_type === 'file' && (
                                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <FileText size={14} className="text-gray-400" />
                                    <span className="text-xs text-gray-600 truncate">{f.field_value || 'No file uploaded yet'}</span>
                                  </div>
                                )}
                              </div>
                            )) : <p className="text-sm text-gray-400 italic">No custom fields defined</p>}
                          </div>
                          {step.fields?.length > 0 && (
                            <button 
                              onClick={() => {
                                const values: any[] = [];
                                step.fields.forEach((f: any) => {
                                  const input = document.querySelector(`[id="field-${f.id}"]`) as any;
                                  if (input) {
                                    values.push({
                                      field_config_id: f.id,
                                      field_value: input.type === 'checkbox' ? input.checked.toString() : input.value
                                    });
                                  }
                                });
                                handleSaveFieldValues(step.id, values);
                              }}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                            >
                              Save Values
                            </button>
                          )}
                        </div>
                      )}

                      {/* Documents Tab */}
                      {tab === 'documents' && (
                        <div className="space-y-3">
                          <button onClick={() => { setUploadStepId(step.id); fileRef.current?.click(); }}
                            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-medium hover:bg-indigo-100">
                            <Upload size={14} /> Upload File
                          </button>
                          {step.documents?.length > 0 ? step.documents.map((doc: any) => (
                            <a key={doc.id} href={`http://localhost:5000/api/uploads/steps/${doc.file_name}`} target="_blank" rel="noreferrer"
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText size={16} className="text-indigo-600 shrink-0" />
                                <span className="text-sm font-medium text-gray-700 truncate">{doc.original_name}</span>
                                <span className="text-xs text-gray-400">{doc.file_type}</span>
                              </div>
                              <Download size={14} className="text-gray-400" />
                            </a>
                          )) : <p className="text-sm text-gray-400 italic">No documents uploaded yet</p>}
                        </div>
                      )}

                      {/* Comments Tab */}
                      {tab === 'comments' && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input value={commentText[step.id] || ''} onChange={e => setCommentText(p => ({...p, [step.id]: e.target.value}))}
                              placeholder="Add a comment..." className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              onKeyDown={e => { if(e.key === 'Enter') handleComment(step.id); }} />
                            <button onClick={() => handleComment(step.id)} className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
                              <MessageSquare size={14} />
                            </button>
                          </div>
                          {step.comments?.length > 0 ? step.comments.map((c: any) => (
                            <div key={c.id} className="p-3 bg-gray-50 rounded-xl">
                              <div className="flex justify-between text-xs"><span className="font-medium text-indigo-600">{c.user_name || 'User'}</span><span className="text-gray-400">{new Date(c.created_at).toLocaleString()}</span></div>
                              <p className="text-sm text-gray-700 mt-1">{c.content}</p>
                            </div>
                          )) : <p className="text-sm text-gray-400 italic">No comments yet</p>}
                        </div>
                      )}

                      {/* Invoices Tab */}
                      {tab === 'invoices' && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <select value={linkInvoiceStep === step.id ? selectedInvoice : ''} onChange={e => { setLinkInvoiceStep(step.id); setSelectedInvoice(e.target.value); }}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none">
                              <option value="">Select invoice to link...</option>
                              {invoices
                                .filter((inv: any) => inv.client_id === project.client_id)
                                .map((inv: any) => <option key={inv.id} value={inv.id}>INV-{inv.id?.slice(0,6)} · Rs.{inv.total_amount} · {inv.status}</option>)}
                            </select>
                            <button onClick={handleLinkInvoice} disabled={linkInvoiceStep !== step.id || !selectedInvoice}
                              className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                              <Link2 size={14} />
                            </button>
                          </div>
                          {step.invoices?.length > 0 ? step.invoices.map((inv: any) => (
                            <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                              <div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => navigate(`/invoices/${inv.id}`)}
                                    className="text-sm font-bold text-indigo-600 hover:underline focus:outline-none"
                                  >
                                    INV-{inv.id?.slice(0,6).toUpperCase()}
                                  </button>
                                  <span className="text-sm text-gray-500">· Rs. {Number(inv.total_amount).toLocaleString()}</span>
                                </div>
                                {(() => {
                                  let items = [];
                                  try { items = inv.items ? JSON.parse(inv.items) : []; } catch (e) { items = []; }
                                  if (items.length === 0 && (inv.description || inv.service_charges_total)) {
                                    items = [{ description: inv.description || 'Service', quantity: 1, price: inv.service_charges_total || 0 }];
                                  }
                                  return items.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {items.map((item: any, i: number) => (
                                        <div key={i} className="text-[10px] text-gray-400 flex justify-between gap-4">
                                          <span>{item.description} (x{item.quantity})</span>
                                          <span className="font-medium">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', 
                                  inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                                  {inv.status}
                                </span>
                                <button onClick={() => { 
                                  let items = [];
                                  try {
                                    items = inv.items ? JSON.parse(inv.items) : [];
                                  } catch (e) { items = []; }
                                  
                                  if (items.length === 0) {
                                    items = [{ description: inv.description || 'Service', quantity: 1, price: inv.service_charges_total || 0 }];
                                  }
                                  setEditingInvoice({...inv, items}); 
                                  setShowInvoiceEditModal(true); 
                                }} className="p-1 text-gray-400 hover:text-indigo-600">
                                  <Pencil size={12} />
                                </button>
                              </div>
                            </div>
                          )) : <p className="text-sm text-gray-400 italic">No invoices linked</p>}
                        </div>
                      )}

                      {tab === 'activity' && (
                        <div className="space-y-2">
                          {step.activity_logs?.length > 0 ? step.activity_logs.map((log: any) => (
                            <div key={log.id} className="flex items-start gap-3 text-sm">
                              <Clock size={14} className="text-gray-300 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-gray-700">{log.action}</span>
                                {log.details && <span className="text-gray-400"> — {log.details}</span>}
                                <div className="text-xs text-gray-400 mt-0.5">{new Date(log.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                          )) : <p className="text-sm text-gray-400 italic">No activity yet</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showFieldModal} onClose={() => setShowFieldModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <Dialog.Title className="text-lg font-bold text-gray-900 mb-4">Add Custom Field</Dialog.Title>
            <form onSubmit={handleAddField} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Label</label>
                <input required value={fieldForm.label} onChange={e => setFieldForm({...fieldForm, label: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Field Type</label>
                <select value={fieldForm.field_type} onChange={e => setFieldForm({...fieldForm, field_type: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none">
                  <option value="text">Textbox</option>
                  <option value="textarea">Textarea</option>
                  <option value="number">Number</option>
                  <option value="select">Dropdown</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="date">Date Picker</option>
                </select>
              </div>
              {fieldForm.field_type === 'select' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Options (comma separated)</label>
                  <input required value={fieldForm.options} onChange={e => setFieldForm({...fieldForm, options: e.target.value})}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="required" checked={fieldForm.required} onChange={e => setFieldForm({...fieldForm, required: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="required" className="text-sm text-gray-700">Mark as Required</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowFieldModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Add</button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Edit Invoice Modal */}
      <Dialog open={showInvoiceEditModal} onClose={() => setShowInvoiceEditModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
            <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">Edit Invoice Details</Dialog.Title>
            {editingInvoice && (
              <form onSubmit={handleUpdateInvoice} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</label>
                    <select value={editingInvoice.status} onChange={e => setEditingInvoice({...editingInvoice, status: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold">
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GST Rate (%)</label>
                    <input type="number" value={editingInvoice.gst_rate} onChange={e => setEditingInvoice({...editingInvoice, gst_rate: Number(e.target.value)})}
                      className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Discount (Rs)</label>
                    <input type="number" value={editingInvoice.discount} onChange={e => setEditingInvoice({...editingInvoice, discount: Number(e.target.value)})}
                      className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-700">Items</h4>
                    <button type="button" onClick={() => setEditingInvoice({...editingInvoice, items: [...editingInvoice.items, {description: '', quantity: 1, price: 0}]})}
                      className="text-xs text-indigo-600 font-bold hover:underline">+ Add Item</button>
                  </div>
                  {editingInvoice.items.map((item:any, idx:number) => (
                    <div key={idx} className="flex gap-3 items-end bg-gray-50 p-3 rounded-xl group relative">
                      <div className="flex-1">
                        <label className="text-[9px] text-gray-400 uppercase font-bold">Description</label>
                        <input value={item.description} onChange={e => {
                          const newItems = [...editingInvoice.items];
                          newItems[idx].description = e.target.value;
                          setEditingInvoice({...editingInvoice, items: newItems});
                        }} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
                      </div>
                      <div className="w-16">
                        <label className="text-[9px] text-gray-400 uppercase font-bold text-center block">Qty</label>
                        <input type="number" value={item.quantity} onChange={e => {
                          const newItems = [...editingInvoice.items];
                          newItems[idx].quantity = Number(e.target.value);
                          setEditingInvoice({...editingInvoice, items: newItems});
                        }} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-center" />
                      </div>
                      <div className="w-24">
                        <label className="text-[9px] text-gray-400 uppercase font-bold">Price</label>
                        <input type="number" value={item.price} onChange={e => {
                          const newItems = [...editingInvoice.items];
                          newItems[idx].price = Number(e.target.value);
                          setEditingInvoice({...editingInvoice, items: newItems});
                        }} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
                      </div>
                      <button type="button" onClick={() => {
                        const newItems = editingInvoice.items.filter((_:any, i:number) => i !== idx);
                        setEditingInvoice({...editingInvoice, items: newItems});
                      }} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex justify-between text-xs font-bold text-gray-400 px-2">
                    <span>Subtotal:</span>
                    <span>Rs. {editingInvoice.items.reduce((s:number, i:any) => s + (i.quantity * i.price), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-red-400 px-2">
                    <span>Discount:</span>
                    <span>- Rs. {(editingInvoice.discount || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-gray-900 text-white p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-xs font-bold uppercase opacity-60">Total Amount</span>
                    <span className="text-xl font-black">
                      Rs. {(
                        (editingInvoice.items.reduce((s:number, i:any) => s + (i.quantity * i.price), 0) - (editingInvoice.discount || 0)) * (1 + editingInvoice.gst_rate/100)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowInvoiceEditModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">Save Changes</button>
                </div>
              </form>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default ProjectDetails;
