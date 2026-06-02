import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, CheckCircle, XCircle, Calculator, Percent, ShieldCheck, Pencil, Calendar, ArrowUpRight, Eye, Download, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

const Invoices: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dynamic Invoice State
  const [formData, setFormData] = useState({
    client_id: '',
    items: [{ id: Math.random().toString(36), description: '', quantity: 1, price: 0 }] as InvoiceItem[],
    discount: 0,
    gst_rate: 18, // Default 18%
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 days from now
  });

  const fetchData = async () => {
    try {
      const [invRes, clientRes] = await Promise.all([
        api.get('/finance/invoices'),
        api.get('/clients')
      ]);
      setInvoices(invRes.data);
      setClients(clientRes.data);
    } catch (error) {
      toast.error('Failed to load invoices');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { id: Math.random().toString(36), description: '', quantity: 1, price: 0 }]
    });
  };

  const removeItem = (id: string) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter(item => item.id !== id)
      });
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setFormData({
      ...formData,
      items: formData.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const afterDiscount = subtotal - formData.discount;
    const gst = (afterDiscount * formData.gst_rate) / 100;
    return afterDiscount + gst;
  };

  const handleEdit = (inv: any) => {
    setEditingInvoiceId(inv.id);
    setFormData({
      client_id: inv.client_id || '',
      items: inv.items ? JSON.parse(inv.items) : [{ id: Math.random().toString(36), description: inv.description || 'Service', quantity: 1, price: inv.service_charges_total || 0 }],
      discount: inv.discount || 0,
      gst_rate: inv.gst_rate || 18,
      due_date: inv.due_date ? new Date(inv.due_date).toISOString().split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInvoiceId(null);
    setFormData({
      client_id: '',
      items: [{ id: Math.random().toString(36), description: '', quantity: 1, price: 0 }],
      discount: 0,
      gst_rate: 18,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Prepare data for backend (calculating totals here to ensure accuracy)
      const subtotal = calculateSubtotal();
      const total_amount = calculateTotal();
      
      const payload = {
        ...formData,
        service_charges_total: subtotal, // Mapping to existing schema or backend can be updated
        other_charges_total: (total_amount - subtotal),
        total_amount: total_amount
      };

      if (editingInvoiceId) {
        await api.put(`/finance/invoices/${editingInvoiceId}`, payload);
        toast.success('Invoice Updated Successfully!');
      } else {
        await api.post('/finance/invoices', payload);
        toast.success('Professional Invoice Generated!');
      }
      closeModal();
      fetchData();
    } catch (error) {
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-fade space-y-8">
      <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Billing & Revenue</h2>
          <p className="text-gray-500 mt-1">Manage professional invoices and track client payments</p>
        </div>
        <button 
          onClick={() => navigate('/invoices/new')} 
          className="inline-flex items-center px-6 py-3 text-sm font-bold text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5 mr-2" /> Create Custom Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by client name or invoice ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Client</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Invoice ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Total Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Remaining Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Due Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">No invoice records found matching the filters</td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                       <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {inv.client_name?.charAt(0)}
                          </div>
                          <span className="font-bold text-gray-900">{inv.client_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => navigate(`/invoices/${inv.id}`)} className="font-mono text-xs text-indigo-600 hover:underline font-bold">
                          #{inv.id.split('-')[0].toUpperCase()}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-extrabold text-gray-900">Rs. {Number(inv.total_amount).toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-extrabold text-rose-600">Rs. {Math.max(0, Number(inv.total_amount) - (Number(inv.amount_paid) || 0)).toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {inv.status === 'paid' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600">
                            <CheckCircle size={12} className="mr-1.5" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600">
                            <XCircle size={12} className="mr-1.5" /> Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/invoices/${inv.id}`)} 
                          className="p-2 text-indigo-600 hover:bg-indigo-50 transition-colors bg-gray-50 rounded-lg"
                          title="View & Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            toast.success('Preparing download...');
                            navigate(`/invoices/${inv.id}?print=true`);
                          }}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors rounded-lg"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this invoice?')) {
                              try {
                                await api.delete(`/finance/invoices/${inv.id}`);
                                toast.success('Invoice deleted');
                                fetchData();
                              } catch (e) {
                                toast.error('Failed to delete invoice');
                              }
                            }
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors rounded-lg"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Invoices;
