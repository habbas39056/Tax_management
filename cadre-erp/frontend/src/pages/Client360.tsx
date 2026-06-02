import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ArrowLeft, User, Briefcase, FileText, CreditCard, MessageSquare, Plus, Edit2, Trash2 } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import clsx from 'clsx';

export default function Client360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [client, setClient] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '', cnic: '', whatsapp_number: '', portal_username: '', portal_password: '', sales_user_id: '', commission_rate: 0
  });

  // Notes Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ id: '', content: '' });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientRes, projectsRes, invoicesRes, staffRes, notesRes, paymentsRes] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get('/projects'),
        api.get('/finance/invoices'),
        api.get('/users/staff'),
        api.get(`/clients/${id}/notes`),
        api.get(`/clients/${id}/payments`)
      ]);

      setClient(clientRes.data);
      setFormData({
        full_name: clientRes.data.full_name || '',
        cnic: clientRes.data.cnic || '',
        whatsapp_number: clientRes.data.whatsapp_number || '',
        portal_username: clientRes.data.portal_username || '',
        portal_password: '',
        sales_user_id: clientRes.data.sales_user_id || '',
        commission_rate: clientRes.data.commission_rate || 0
      });

      // Filter projects and invoices by this client
      setProjects(projectsRes.data.filter((p: any) => p.client_id === id));
      setInvoices(invoicesRes.data.filter((i: any) => i.client_id === id));
      setAgents(staffRes.data.filter((u: any) => u.role_name === 'Sales'));
      setNotes(notesRes.data);
      setPayments(paymentsRes.data);

    } catch (error) {
      console.error('Failed to load client 360 data', error);
      toast.error('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/clients/${id}`, formData);
      toast.success('Client updated successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update client');
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (noteForm.id) {
        await api.put(`/clients/${id}/notes/${noteForm.id}`, { note_content: noteForm.content });
        toast.success('Note updated successfully');
      } else {
        await api.post(`/clients/${id}/notes`, { note_content: noteForm.content });
        toast.success('Note added successfully');
      }
      setIsNoteModalOpen(false);
      const res = await api.get(`/clients/${id}/notes`);
      setNotes(res.data);
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await api.delete(`/clients/${id}/notes/${noteId}`);
      toast.success('Note deleted');
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Client 360 View...</div>;
  if (!client) return <div className="p-8 text-center text-gray-500">Client not found.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/clients')} className="p-2 text-gray-400 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.full_name}</h1>
          <p className="text-sm font-medium text-gray-500">Client 360 View</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {[
          { id: 'profile', icon: User, label: 'Profile Settings' },
          { id: 'projects', icon: Briefcase, label: 'Projects' },
          { id: 'invoices', icon: FileText, label: 'Invoices' },
          { id: 'payments', icon: CreditCard, label: 'Payments' },
          { id: 'notes', icon: MessageSquare, label: 'Notes' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex-1 justify-center gap-2 whitespace-nowrap",
              activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 min-h-[400px]">
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdate} className="space-y-6 max-w-3xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Client Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CNIC Number</label>
                <input required type="text" value={formData.cnic} onChange={e => setFormData({...formData, cnic: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
                <input required type="text" value={formData.whatsapp_number} onChange={e => setFormData({...formData, whatsapp_number: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Commission Rate (%)</label>
                <input type="number" step="0.01" value={formData.commission_rate} onChange={e => setFormData({...formData, commission_rate: parseFloat(e.target.value)})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              {user?.role === 'Super Admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned Sales Agent</label>
                  <select value={formData.sales_user_id || ''} onChange={e => setFormData({...formData, sales_user_id: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <option value="">No Agent</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-4">Portal Credentials</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Portal Username</label>
                  <input required type="text" value={formData.portal_username} onChange={e => setFormData({...formData, portal_username: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password (leave blank to keep current)</label>
                  <input type="text" value={formData.portal_password} onChange={e => setFormData({...formData, portal_password: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Enter new password" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                Save Changes
              </button>
            </div>
          </form>
        )}

        {activeTab === 'projects' && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Assigned Projects</h3>
            {projects.length === 0 ? <p className="text-sm text-gray-500">No projects found.</p> : (
              <div className="space-y-3">
                {projects.map(p => (
                  <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer transition-colors">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{p.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Service: {p.service_name}</div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-lg uppercase">{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Invoice Ledger</h3>
            {invoices.length === 0 ? <p className="text-sm text-gray-500">No invoices found.</p> : (
              <div className="space-y-3">
                {invoices.map(inv => {
                  const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
                  const itemTitles = items?.map((i:any) => i.description).join(', ');
                  return (
                    <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer transition-colors">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 text-sm">Invoice #{inv.id.substring(0,8).toUpperCase()}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{itemTitles}</div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="font-bold text-gray-900 text-sm">Rs. {Number(inv.total_amount).toLocaleString()}</div>
                        <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 uppercase", inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700')}>{inv.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Payment History</h3>
            {payments.length === 0 ? <p className="text-sm text-gray-500">No payments recorded.</p> : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Invoice Ref</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Method</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {payments.map(payment => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">{new Date(payment.payment_date).toLocaleDateString()}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-indigo-600 font-medium">#{payment.invoice_id ? payment.invoice_id.substring(0,8).toUpperCase() : 'N/A'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-bold">Rs. {Number(payment.amount).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">{payment.payment_method}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{payment.reference_number || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Client Notes</h3>
              <button onClick={() => { setNoteForm({ id: '', content: '' }); setIsNoteModalOpen(true); }} className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4 mr-1" /> Add Note
              </button>
            </div>
            {notes.length === 0 ? <p className="text-sm text-gray-500">No notes found.</p> : (
              <div className="space-y-4">
                {notes.map(note => (
                  <div key={note.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">{new Date(note.created_at).toLocaleString()}</span>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => { setNoteForm({ id: note.id, content: note.content }); setIsNoteModalOpen(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-xl shadow-2xl">
            <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">{noteForm.id ? 'Edit Note' : 'Add Note'}</Dialog.Title>
            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <textarea required rows={4} value={noteForm.content} onChange={e => setNoteForm({...noteForm, content: e.target.value})} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" placeholder="Write a note..." />
              </div>
              <div className="flex justify-end pt-4 space-x-3">
                <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Save</button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
