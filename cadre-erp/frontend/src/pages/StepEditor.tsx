import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Plus, X, CreditCard, FileText, Loader2, Pencil, ExternalLink } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUSES = ['Pending','In Progress','Completed','Rejected','On Hold','Cancelled'];

const StepEditor: React.FC = () => {
  const { projectId, stepId } = useParams<{projectId: string, stepId?: string}>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Pending',
    assigned_user_id: '',
    due_date: '',
    rejection_reason: '',
    needs_payment: false,
    needs_fields: false,
    order_index: 0
  });

  const [fields, setFields] = useState<any[]>([]);
  const [linkedInvoices, setLinkedInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [showInvoiceEditModal, setShowInvoiceEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [uRes, iRes, pRes] = await Promise.all([
        api.get('/users/staff'),
        api.get('/finance/invoices'),
        api.get(`/projects/${projectId}`)
      ]);
      setUsers(uRes.data);
      setInvoices(iRes.data);
      setProject(pRes.data);

      if (stepId && stepId !== 'new') {
        const step = pRes.data.steps.find((s: any) => s.id === stepId);
        if (step) {
          setFormData({
            title: step.title,
            description: step.description || '',
            status: step.status,
            assigned_user_id: step.assigned_user_id || '',
            due_date: step.due_date?.split('T')[0] || '',
            rejection_reason: step.rejection_reason || '',
            needs_payment: !!step.needs_payment,
            needs_fields: !!step.needs_fields,
            order_index: step.order_index
          });
          setFields(step.fields || []);
          setLinkedInvoices(step.invoices || []);
        }
      } else {
        setFormData(prev => ({ ...prev, order_index: pRes.data.steps?.length || 0 }));
      }
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [projectId, stepId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let currentStepId = stepId;
      // After creating a new step, auto‑link the project's invoice (if any)
      if (!stepId || stepId === 'new') {
        const res = await api.post(`/projects/${projectId}/steps`, formData);
        currentStepId = res.data.id;
      } else {
        await api.put(`/projects/steps/${stepId}`, formData);
      }
      
      // Sync fields (if enabled)
      if (formData.needs_fields && fields.length > 0) {
          // For existing steps, we should probably have a cleaner way, 
          // but for now, let's just send them all. 
          // The backend should handle clearing/updating.
          await api.post(`/projects/steps/${currentStepId}/fields/sync`, { fields });
      }
      
      toast.success('Milestone saved successfully');
      navigate(`/projects/${projectId}`);
    } catch (e) {
      toast.error('Failed to save milestone');
    } finally {
      setSaving(false);
    }
  };

  const openInvoiceEditor = (inv: any) => {
    // Toggle: clicking same invoice closes the editor
    if (editingInvoice?.id === inv.id) {
      setEditingInvoice(null);
      return;
    }
    // Get full invoice data from the fetched invoices list
    const fullInv = invoices.find((i: any) => i.id === inv.id) || inv;
    let parsedItems = fullInv.items;
    if (typeof parsedItems === 'string') {
      try { parsedItems = JSON.parse(parsedItems); } catch { parsedItems = []; }
    }
    if (!parsedItems || !Array.isArray(parsedItems)) parsedItems = [];
    setEditingInvoice({ ...fullInv, items: parsedItems });
  };

  const handleLinkInvoice = async () => {
    if (!selectedInvoice || !stepId || stepId === 'new') return;
    try {
      await api.post(`/projects/steps/${stepId}/invoices`, { invoice_id: selectedInvoice });
      toast.success('Invoice linked');
      setSelectedInvoice('');
      fetchData();
    } catch (e) {
      toast.error('Failed to link invoice');
    }
  };

  const updateEditingItem = (idx: number, field: string, value: any) => {
    const items = [...editingInvoice.items];
    items[idx] = { ...items[idx], [field]: value };
    setEditingInvoice({ ...editingInvoice, items });
  };

  const addEditingItem = () => {
    setEditingInvoice({
      ...editingInvoice,
      items: [...editingInvoice.items, { description: '', quantity: 1, price: 0, tax_rate: 0, is_service_charge: true, is_other_payment: false }]
    });
  };

  const removeEditingItem = (idx: number) => {
    const items = editingInvoice.items.filter((_: any, i: number) => i !== idx);
    setEditingInvoice({ ...editingInvoice, items });
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return;
    try {
      const subtotal = editingInvoice.items.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
      const serviceTotal = editingInvoice.items.reduce((s: number, i: any) => i.is_service_charge ? s + ((i.quantity || 0) * (i.price || 0)) : s, 0);
      const discount = Number(editingInvoice.discount || 0);
      const gstRate = Number(editingInvoice.gst_rate || 0);
      const afterDiscount = subtotal - discount;
      const taxAmount = (afterDiscount * gstRate) / 100;
      const total = afterDiscount + taxAmount;

      const payload = {
        client_id: editingInvoice.client_id,
        items: editingInvoice.items,
        discount,
        gst_rate: gstRate,
        tax_amount: taxAmount,
        due_date: editingInvoice.due_date,
        total_amount: total,
        service_charges_total: serviceTotal,
        other_charges_total: subtotal - serviceTotal,
        status: editingInvoice.status || 'unpaid',
        sales_user_id: editingInvoice.sales_user_id,
        bill_from_name: editingInvoice.bill_from_name,
        bill_from_address: editingInvoice.bill_from_address
      };

      await api.put(`/finance/invoices/${editingInvoice.id}`, payload);
      toast.success('Invoice updated');
      setEditingInvoice(null);
      fetchData();
    } catch { toast.error('Failed to update invoice'); }
  };

  const renderInlineInvoiceEditor = (inv: any) => {
    if (!inv || editingInvoice?.id !== inv.id) return null;
    return (
      <div className="bg-white border border-indigo-100 rounded-2xl overflow-hidden shadow-sm mt-3">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase w-10">#</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase">Item</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right w-20">Qty</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right w-24">Rate</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right w-20">Tax%</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right w-24">Amount</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {editingInvoice.items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400 italic">No items yet. Click "+ Add Item" below.</td></tr>
            )}
            {editingInvoice.items.map((item: any, idx: number) => {
              const amt = (item.quantity || 0) * (item.price || 0);
              const tax = amt * (item.tax_rate || 0) / 100;
              return (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm font-bold text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <input value={item.description || ''} onChange={e => updateEditingItem(idx, 'description', e.target.value)}
                      className="w-full bg-transparent border-none text-sm font-bold text-gray-900 p-0 outline-none" placeholder="Item description" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={item.quantity || 0} onChange={e => updateEditingItem(idx, 'quantity', Number(e.target.value))}
                      className="w-full bg-transparent border-none text-sm font-bold text-gray-900 p-0 text-right outline-none" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={item.price || 0} onChange={e => updateEditingItem(idx, 'price', Number(e.target.value))}
                      className="w-full bg-transparent border-none text-sm font-bold text-gray-900 p-0 text-right outline-none" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={item.tax_rate || 0} onChange={e => updateEditingItem(idx, 'tax_rate', Number(e.target.value))}
                      className="w-16 bg-transparent border-none text-sm font-bold text-gray-900 p-0 text-right outline-none" />
                  </td>
                  <td className="px-4 py-3 text-sm font-black text-gray-900 text-right">{(amt + tax).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => removeEditingItem(idx)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100">
          <button type="button" onClick={addEditingItem}
            className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-indigo-600 text-xs font-black uppercase hover:bg-indigo-50 transition-all">
            + Add Item
          </button>
        </div>
        <div className="px-4 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-2xl">
          <div className="text-sm font-black text-gray-900">
            Total: Rs. {editingInvoice.items.reduce((s: number, i: any) => {
              const a = (i.quantity || 0) * (i.price || 0);
              return s + a + (a * (i.tax_rate || 0) / 100);
            }, 0).toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditingInvoice(null)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition-all">Cancel</button>
            <button type="button" onClick={handleUpdateInvoice} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all">Save</button>
          </div>
        </div>
      </div>
    );
  };


  const addField = () => {
    setFields([...fields, { label: '', field_type: 'text', options: '', required: false }]);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/projects/${projectId}`)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Project: {project?.title}</p>
              <h1 className="text-xl font-black text-gray-900">{stepId === 'new' ? 'New Milestone' : 'Edit Milestone'}</h1>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            SAVE MILESTONE
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            {/* Core Info */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 space-y-6">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-50 pb-4">Basic Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Milestone Title</label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Initial Consultation" className="w-full mt-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4}
                    placeholder="Describe what needs to be done..." className="w-full mt-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
                </div>
              </div>
            </div>

            {/* Custom Fields Section */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                   <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", formData.needs_fields ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400")}>
                     <FileText size={16} />
                   </div>
                   <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Client Information Form</h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.needs_fields} onChange={e => setFormData({...formData, needs_fields: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {formData.needs_fields && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {fields.map((field, fidx) => (
                      <div key={fidx} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 relative group">
                        <button type="button" onClick={() => setFields(fields.filter((_, i) => i !== fidx))}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-gray-100 text-red-500 rounded-xl flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                          <X size={14} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Field Label</label>
                            <input value={field.label} onChange={e => {
                              const newFields = [...fields];
                              newFields[fidx].label = e.target.value;
                              setFields(newFields);
                            }} placeholder="e.g. Passport Number" className="w-full mt-1 px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold" />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Input Type</label>
                            <select value={field.field_type} onChange={e => {
                              const newFields = [...fields];
                              newFields[fidx].field_type = e.target.value;
                              setFields(newFields);
                            }} className="w-full mt-1 px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold">
                              <option value="text">Short Text</option>
                              <option value="textarea">Long Text</option>
                              <option value="number">Number</option>
                              <option value="select">Dropdown</option>
                              <option value="date">Date Picker</option>
                              <option value="file">File Upload Request</option>
                            </select>
                          </div>
                        </div>
                        {field.field_type === 'select' && (
                          <div className="mt-4">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Options (Comma Separated)</label>
                            <input value={field.options} onChange={e => {
                              const newFields = [...fields];
                              newFields[fidx].options = e.target.value;
                              setFields(newFields);
                            }} placeholder="Option 1, Option 2, Option 3" className="w-full mt-1 px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addField} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-3xl text-indigo-600 text-xs font-black uppercase hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                    + Add Question to Form
                  </button>
                </div>
              )}
            </div>

            {/* Invoices Section */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                   <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", formData.needs_payment ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400")}>
                     <CreditCard size={16} />
                   </div>
                   <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Payments & Billing</h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.needs_payment} onChange={e => setFormData({...formData, needs_payment: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {formData.needs_payment && (
                <div className="space-y-6">
                   <div className="grid grid-cols-1 gap-4">
                      {linkedInvoices.map((inv: any) => (
                        <div key={inv.id} className="space-y-0">
                          <div className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                                 <CreditCard size={16} />
                               </div>
                               <div>
                                 <p className="text-xs font-black text-gray-900 uppercase">INV-{inv.id.slice(0,8)}</p>
                                 <p className="text-[10px] font-bold text-emerald-600">Rs. {Number(inv.total_amount).toLocaleString()} ({inv.status})</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => openInvoiceEditor(inv)} className="p-2 text-gray-400 hover:text-indigo-600" title="Edit Items">
                                <Pencil size={18} />
                              </button>
                              <button type="button" onClick={() => navigate(`/invoices/${inv.id}`)} className="p-2 text-gray-400 hover:text-indigo-600" title="Open Full Invoice">
                                <ExternalLink size={16} />
                              </button>
                            </div>
                          </div>
                          {renderInlineInvoiceEditor(inv)}
                        </div>
                      ))}
                   </div>
                   
                   {stepId === 'new' ? (
                     <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center">
                       <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-3">
                         The project's default invoice will be automatically linked when you save this milestone.
                       </p>
                       {project?.invoice_id && invoices.find(i => i.id === project.invoice_id) && (
                         <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-emerald-100 shadow-sm mt-3 text-left">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                                <CreditCard size={16} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-gray-900 uppercase">INV-{project.invoice_id.slice(0,8)}</p>
                                <p className="text-[10px] font-bold text-emerald-600">Rs. {Number(invoices.find(i => i.id === project.invoice_id)?.total_amount).toLocaleString()} ({invoices.find(i => i.id === project.invoice_id)?.status})</p>
                              </div>
                           </div>
                           <button type="button" onClick={() => openInvoiceEditor(invoices.find((i: any) => i.id === project.invoice_id))} className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded-lg" title="Edit Items">
                             <Pencil size={16} />
                           </button>
                           <button type="button" onClick={() => navigate(`/invoices/${project.invoice_id}`)} className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded-lg" title="Open Full Invoice">
                             <ExternalLink size={16} />
                           </button>
                         </div>
                       )}
                       {project?.invoice_id && renderInlineInvoiceEditor(invoices.find((i: any) => i.id === project.invoice_id))}
                     </div>
                   ) : (
                     <div className="flex gap-3">
                        <div className="relative flex-1">
                          <select value={selectedInvoice} onChange={e => setSelectedInvoice(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                            <option value="">Select Invoice to Link...</option>
                            {invoices.filter(inv => inv.client_id === project?.client_id).map(inv => (
                              <option key={inv.id} value={inv.id}>INV-{inv.id.slice(0,8)} (Rs. {Number(inv.total_amount).toLocaleString()})</option>
                            ))}
                          </select>
                          {selectedInvoice && (
                            <button type="button" onClick={() => openInvoiceEditor(invoices.find(i => i.id === selectedInvoice))}
                              className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                              <Pencil size={16} />
                            </button>
                          )}
                        </div>
                        <button type="button" onClick={handleLinkInvoice} disabled={!selectedInvoice}
                          className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-600 transition-all disabled:opacity-50">
                          Link
                        </button>
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {/* Status & Assignment */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 space-y-6">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-50 pb-4">Workflow Info</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full mt-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assign Specialist</label>
                  <select value={formData.assigned_user_id} onChange={e => setFormData({...formData, assigned_user_id: e.target.value})}
                    className="w-full mt-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none">
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deadline</label>
                  <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})}
                    className="w-full mt-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" />
                </div>
              </div>
            </div>

            {/* Rejection Reason */}
            {formData.status === 'Rejected' && (
              <div className="bg-red-50 rounded-[32px] border border-red-100 shadow-sm p-8 space-y-4">
                <h2 className="text-sm font-black text-red-600 uppercase tracking-widest">Rejection Reason</h2>
                <textarea required value={formData.rejection_reason} onChange={e => setFormData({...formData, rejection_reason: e.target.value})} rows={3}
                  placeholder="Explain why this was rejected..." className="w-full px-4 py-3 bg-white border border-red-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all" />
              </div>
            )}
          </div>
        </form>
      </div>
    </div>

        </>
  );
};

export default StepEditor;
