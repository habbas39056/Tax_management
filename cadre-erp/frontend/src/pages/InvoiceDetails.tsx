import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  ArrowLeft, Download, Mail, MoreHorizontal, Plus, 
  Pencil, Printer, Eye, Maximize2, Loader2, 
  Trash2, Send, CreditCard, Activity, MessageSquare, Bell, Clock, Check, Shield, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('invoice');
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);

  // Edit State
  const [editData, setEditData] = useState<any>(null);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);

  const fetchAgents = async () => {
    try {
      const res = await api.get('/users/staff');
      setAgents(res.data.filter((u: any) => u.role_name === 'Sales'));
    } catch (e) {}
  };
  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/finance/invoices/${id}`);
      setInvoice(res.data);
      setEditData({
        ...res.data,
        items: res.data.items ? (typeof res.data.items === 'string' ? JSON.parse(res.data.items) : res.data.items) : []
      });
    } catch (e) {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const [clients, setClients] = useState<any[]>([]);
  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (e) {}
  };

  const [services, setServices] = useState<any[]>([]);
  const fetchServices = async () => {
    try {
      const res = await api.get('/projects/services');
      setServices(res.data);
    } catch (e) {}
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Bank Transfer',
    transaction_id: '',
    notes: ''
  });

  const fetchPayments = async () => {
    try {
      const res = await api.get(`/finance/payments/${id}`);
      setPayments(res.data);
    } catch (e) {}
  };

  const handleRecordPayment = async () => {
    try {
      await api.post('/finance/payments', {
        ...paymentData,
        invoice_id: id,
        amount: Number(paymentData.amount)
      });
      toast.success('Payment recorded');
      setShowPaymentModal(false);
      fetchPayments();
      fetchInvoice();
      setPaymentData({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'Bank Transfer',
        transaction_id: '',
        notes: ''
      });
    } catch (e) {
      toast.error('Failed to record payment');
    }
  };

  const handleDeletePayment = async (payId: string) => {
    if (!window.confirm('Delete this payment?')) return;
    try {
      await api.delete(`/finance/payments/${payId}`);
      toast.success('Payment deleted');
      fetchPayments();
      fetchInvoice();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  useEffect(() => {
    if (id !== 'new') {
      fetchInvoice();
      fetchPayments();
    } else {
      setInvoice({
        status: 'unpaid',
        client_name: 'Select Client',
        created_at: new Date().toISOString(),
        items: '[]'
      });
      setEditData({
        client_id: '',
        status: 'unpaid',
        items: [{ description: '', quantity: 1, price: 0 }],
        discount: 0,
        gst_rate: 18
      });
      setIsEditing(true);
      setLoading(false);
    }
    fetchClients();
    fetchAgents();
    fetchServices();
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!loading && invoice && params.get('print') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, invoice]);

  const handleUpdate = async () => {
    try {
      // 1. Mandatory Fields Validation (except tax/gst and discount)
      if (!editData.client_id) {
        toast.error('Please select a Client.');
        return;
      }
      if (!editData.created_at) {
        toast.error('Please select an Invoice Date.');
        return;
      }
      if (!editData.due_date) {
        toast.error('Please select a Due Date.');
        return;
      }
      
      const salesAgentId = user?.role === 'Super Admin' 
        ? editData.sales_user_id 
        : (editData.sales_user_id || user?.id);
      if (!salesAgentId) {
        toast.error('Please select a Sale Agent.');
        return;
      }

      const billFromName = (editData.bill_from_name || 'Adwise Labs').trim();
      const billFromAddress = (editData.bill_from_address || `A-205 / II Saba Ave, DHA Karachi Phase VIII Zone A Phase VIII\nDefence Housing Authority\nKarachi Sindh\n76500`).trim();
      
      if (!billFromName) {
        toast.error('Bill From Name cannot be empty.');
        return;
      }
      if (!billFromAddress) {
        toast.error('Bill From Address cannot be empty.');
        return;
      }

      if (!editData.items || editData.items.length === 0) {
        toast.error('Please add at least one line item.');
        return;
      }

      for (let i = 0; i < editData.items.length; i++) {
        const item = editData.items[i];
        if (!item.description || !item.description.trim()) {
          toast.error(`Item #${i + 1} Description is required.`);
          return;
        }
        if (item.quantity === undefined || item.quantity === null || Number(item.quantity) <= 0) {
          toast.error(`Item #${i + 1} Quantity must be greater than 0.`);
          return;
        }
        if (item.price === undefined || item.price === null || Number(item.price) <= 0) {
          toast.error(`Item #${i + 1} Rate must be greater than 0.`);
          return;
        }
      }

      const subtotal = editData.items.reduce((s: number, i: any) => s + (i.quantity * i.price), 0);
      const serviceTotal = editData.items.reduce((s: number, i: any) => i.is_service_charge ? s + (i.quantity * i.price) : s, 0);
      const calculatedItemTax = editData.items.reduce((s: number, i: any) => s + (i.quantity * i.price * (i.tax_rate || 0) / 100), 0);
      const afterDiscount = subtotal - Number(editData.discount || 0);
      const gst = editData.tax_amount !== undefined ? Number(editData.tax_amount) : calculatedItemTax;
      const total = afterDiscount + gst;

      const payload = {
        ...editData,
        bill_from_name: billFromName,
        bill_from_address: billFromAddress,
        discount: Number(editData.discount || 0),
        gst_rate: Number(editData.gst_rate || 0),
        sales_user_id: salesAgentId,
        items: JSON.stringify(editData.items),
        service_charges_total: serviceTotal,
        other_charges_total: subtotal - serviceTotal,
        tax_amount: editData.tax_amount !== undefined ? Number(editData.tax_amount) : gst,
        total_amount: total
      };

      if (id === 'new') {
        const res = await api.post('/finance/invoices', payload);
        toast.success('Invoice created');
        navigate('/invoices');
      } else {
        await api.put(`/finance/invoices/${id}`, payload);
        toast.success('Invoice updated');
        setIsEditing(false);
        navigate('/invoices');
      }
    } catch (e) {
      toast.error('Failed to save');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
    </div>
  );

  const items = isEditing ? editData.items : (invoice.items ? (typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items) : []);
  const subtotal = items.reduce((s: number, i: any) => s + (i.quantity * i.price), 0);
  const serviceTotal = items.reduce((s: number, i: any) => i.is_service_charge ? s + (i.quantity * i.price) : s, 0);
  const discount = isEditing ? Number(editData?.discount || 0) : (Number(invoice?.discount) || 0);
  const calculatedItemTax = items.reduce((s: number, i: any) => s + (i.quantity * i.price * (i.tax_rate || 0) / 100), 0);
  const calculatedGst = calculatedItemTax;
  const gst = isEditing 
    ? (editData?.tax_amount !== undefined ? Number(editData.tax_amount) : calculatedGst) 
    : (Number(invoice?.tax_amount) || 0);
  const total = isEditing ? (subtotal - discount + gst) : (Number(invoice?.total_amount) || 0);

  const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const remainingAmount = Math.max(0, total - totalPaid);

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <style dangerouslySetInnerHTML={{__html: `
        .print-only {
          display: none !important;
        }
        @media print {
          @page {
            margin: 0;
          }
          
          /* Hide non-printable items */
          nav, sidebar, header, .no-print, button, .bg-white.border-b, .bg-white.px-6.border-b, [role="navigation"], [role="banner"] {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          /* Full page layout reset */
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Hide all page content by default */
          body * {
            visibility: hidden;
          }

          /* Ensure .print-layout and its children are visible */
          .print-layout, .print-layout * {
            visibility: visible !important;
          }

          /* Remove restriction boundaries on all ancestors */
          div, main, section, #root {
            position: static !important;
            overflow: visible !important;
            max-width: none !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          /* Page sheet styles */
          .print-layout {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            padding: 40px !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            display: block !important;
          }

          /* Table sizing and layout */
          table {
            width: 100% !important;
            table-layout: auto !important;
          }
          
          tr, td, th {
            page-break-inside: avoid !important;
          }
        }
      `}} />
      {/* Top Header/Nav */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold text-gray-600">
              <ArrowLeft size={18} />
              Back to Invoices
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 border-b border-gray-100">
            <div className="flex gap-8">
              {[
                { id: 'invoice', label: 'Invoice' },
                { id: 'payments', label: 'Payments' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={clsx(
                    "py-5 text-sm font-black transition-all border-b-2 relative",
                    activeTab === t.id ? "text-indigo-600 border-indigo-600" : "text-gray-400 border-transparent hover:text-gray-600"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'invoice' && (
              <div className="space-y-12">
                {/* Actions Toolbar */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                      (isEditing ? editData.status : invoice.status) === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-yellow-50 text-yellow-600 border-yellow-100"
                    )}>
                      {isEditing ? editData.status : invoice.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 no-print">
                    <button 
                      onClick={() => window.print()}
                      className="p-2.5 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-lg transition-all"
                      title="Print / Download PDF"
                    >
                      <Printer size={18} />
                    </button>
                    <button onClick={() => setIsEditing(!isEditing)} className={clsx(
                          "p-2.5 border rounded-lg transition-all",
                          isEditing ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                        )}>
                          <Pencil size={18} />
                        </button>
                      <button 
                        onClick={() => setShowPaymentModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#4ADE80] text-white rounded-lg text-sm font-black shadow-sm hover:opacity-90"
                      >
                        <Plus size={16} />
                        Payment
                      </button>
                    </div>
                  </div>

                {/* Payment Modal */}
                {showPaymentModal && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in duration-200">
                      <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-xl font-black text-gray-900">Record Payment for INV-{invoice.id?.slice(0, 8)}</h2>
                        <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          <Maximize2 size={20} />
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-8 space-y-10">
                        <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                          {/* Left Column */}
                          <div className="space-y-6">
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">* Amount Received</label>
                              <input 
                                type="number" 
                                value={paymentData.amount}
                                onChange={e => setPaymentData({...paymentData, amount: e.target.value})}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">* Payment Date</label>
                              <div className="relative">
                                <input 
                                  type="date" 
                                  value={paymentData.payment_date}
                                  onChange={e => setPaymentData({...paymentData, payment_date: e.target.value})}
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">* Payment Mode</label>
                              <select 
                                value={paymentData.payment_mode}
                                onChange={e => setPaymentData({...paymentData, payment_mode: e.target.value})}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none"
                              >
                                <option>Bank Al Falah</option>
                                <option>HBL</option>
                                <option>Cash</option>
                                <option>Check</option>
                                <option>Bank Transfer</option>
                              </select>
                            </div>
                          </div>

                          {/* Right Column */}
                          <div className="space-y-6">
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transaction ID</label>
                              <input 
                                type="text" 
                                value={paymentData.transaction_id}
                                onChange={e => setPaymentData({...paymentData, transaction_id: e.target.value})}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                placeholder="TXN-XXXXXX"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Leave a note</label>
                              <textarea 
                                value={paymentData.notes}
                                onChange={e => setPaymentData({...paymentData, notes: e.target.value})}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none min-h-[140px] resize-none"
                                placeholder="Admin Note"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Payments Received Table */}
                        <div className="space-y-4 pt-6 border-t border-gray-100">
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Payments Received</h3>
                          <div className="border border-gray-100 rounded-xl overflow-hidden">
                            <table className="w-full text-left">
                              <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment #</th>
                                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Mode</th>
                                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Options</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {payments.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-sm font-bold text-gray-400 italic">No payments recorded yet.</td>
                                  </tr>
                                ) : (
                                  payments.map((p, idx) => (
                                    <tr key={p.id}>
                                      <td className="px-6 py-4 text-sm font-bold text-gray-600">{idx + 1}</td>
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-indigo-50 rounded flex items-center justify-center text-indigo-600">
                                            <CreditCard size={14} />
                                          </div>
                                          <span className="text-sm font-black text-gray-900">{p.payment_mode}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-sm font-bold text-gray-600">{new Date(p.payment_date).toLocaleDateString()}</td>
                                      <td className="px-6 py-4 text-sm font-black text-gray-900 text-right">Rs. {p.amount.toLocaleString()}</td>
                                      <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <button className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"><Pencil size={14} /></button>
                                          <button onClick={() => handleDeletePayment(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                        <button 
                          onClick={() => setShowPaymentModal(false)}
                          className="px-6 py-2.5 bg-red-500 text-white rounded-lg text-sm font-black shadow-md hover:bg-red-600 transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleRecordPayment}
                          className="px-6 py-2.5 bg-[#4ADE80] text-white rounded-lg text-sm font-black shadow-md hover:opacity-90 transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice Body (Screen Only) */}
                <div id="invoice-sheet" className="space-y-10 bg-white p-8 rounded-2xl no-print">
                  {/* Top Logo and Invoice ID Header */}
                  <div className="flex justify-between items-center border-b border-gray-100 pb-8">
                    <img src="/logo.png" alt="Logo" className="w-44 h-auto object-contain print-only" />
                    <div className="text-right">
                      <h2 className="text-[24px] font-black text-indigo-600 uppercase tracking-tight">INV-{invoice.id?.slice(0, 8)}</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-20">
                  <div className="space-y-6">
                    <div className="space-y-4 p-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Bill From</p>
                      <div className="space-y-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input 
                              value={editData.bill_from_name || 'Adwise Labs'} 
                              onChange={e => setEditData({...editData, bill_from_name: e.target.value})}
                              className="text-lg font-black text-gray-900 bg-transparent border-b border-indigo-200 w-full outline-none focus:border-indigo-500"
                              placeholder="Company Name"
                            />
                            <textarea 
                              value={editData.bill_from_address || `A-205 / II Saba Ave, DHA Karachi Phase VIII Zone A Phase VIII\nDefence Housing Authority\nKarachi Sindh\n76500`}
                              onChange={e => setEditData({...editData, bill_from_address: e.target.value})}
                              className="text-sm text-gray-500 leading-relaxed font-medium bg-transparent border-b border-indigo-100 w-full outline-none focus:border-indigo-400 min-h-[100px] resize-none"
                              placeholder="Address Line 1\nAddress Line 2"
                            />
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg font-black text-gray-900">{invoice.bill_from_name || 'Adwise Labs'}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed font-medium whitespace-pre-line">
                              {invoice.bill_from_address || `A-205 / II Saba Ave, DHA Karachi Phase VIII Zone A Phase VIII\nDefence Housing Authority\nKarachi Sindh\n76500`}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">Bill To</p>
                      {isEditing ? (
                        <select 
                          value={editData.client_id}
                          onChange={e => setEditData({...editData, client_id: e.target.value})}
                          className="w-full px-4 py-2 bg-indigo-50 border-none rounded-lg text-sm font-black text-indigo-600 outline-none text-right appearance-none"
                        >
                          <option value="">Select Client...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                        </select>
                      ) : (
                        <h3 className="text-lg font-black text-indigo-600">{invoice.client_name}</h3>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-end items-center gap-3">
                         <span className="text-sm font-bold text-gray-400">Invoice Date:</span>
                         {isEditing ? (
                           <input type="date" value={editData.created_at?.split('T')[0]} 
                             onChange={e => setEditData({...editData, created_at: e.target.value})}
                             className="text-sm font-black text-gray-700 bg-transparent border-none p-0 focus:ring-0 text-right w-32" />
                         ) : (
                           <span className="text-sm font-black text-gray-700">{new Date(invoice.created_at).toLocaleDateString()}</span>
                         )}
                      </div>
                      <div className="flex justify-end items-center gap-3">
                         <span className="text-sm font-bold text-gray-400">Due Date:</span>
                         {isEditing ? (
                           <input type="date" value={editData.due_date?.split('T')[0]} 
                             onChange={e => setEditData({...editData, due_date: e.target.value})}
                             className="text-sm font-black text-gray-700 bg-transparent border-none p-0 focus:ring-0 text-right w-32" />
                         ) : (
                           <span className="text-sm font-black text-gray-700">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</span>
                         )}
                      </div>
                      <div className="flex justify-end items-center gap-3">
                         <span className="text-sm font-bold text-gray-400">Sale Agent:</span>
                         {isEditing ? (
                           user?.role === 'Super Admin' ? (
                             <select 
                               value={editData.sales_user_id || ''} 
                               onChange={e => setEditData({...editData, sales_user_id: e.target.value})}
                               className="text-sm font-black text-gray-700 bg-indigo-50 border-none rounded px-2 py-1 focus:ring-0 text-right appearance-none"
                             >
                               <option value="">Select Agent...</option>
                               {agents.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                             </select>
                           ) : (
                             <span className="text-sm font-black text-gray-700">{user?.name}</span>
                           )
                         ) : (
                           <span className="text-sm font-black text-gray-700">{invoice.agent_name || user?.name}</span>
                         )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-gray-100 rounded-xl overflow-visible shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-gray-100">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-16 text-center">#</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-32 no-print">Category</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right w-24">Qty</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right w-32">Rate</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right w-24">Tax</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right w-40">Amount</th>
                        {isEditing && <th className="px-4 py-4 w-12 text-center">
                          <button onClick={() => setEditData({...editData, items: [...editData.items, {description: '', quantity: 1, price: 0}]})}
                            className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:scale-110 transition-all">
                            <Plus size={14} />
                          </button>
                        </th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((item: any, idx: number) => (
                        <tr key={idx} className="group">
                          <td className="px-6 py-5 text-sm font-bold text-gray-400 text-center">{idx + 1}</td>
                          <td className="px-6 py-5">
                            {isEditing ? (
                              <div className="relative group w-full">
                                <input 
                                  value={item.description} 
                                  onChange={e => {
                                    const newItems = [...editData.items];
                                    newItems[idx].description = e.target.value;
                                    setEditData({...editData, items: newItems});
                                  }} 
                                  onFocus={() => setOpenDropdownIdx(idx)}
                                  onBlur={() => setTimeout(() => setOpenDropdownIdx(null), 200)}
                                  className="w-full bg-transparent border-b border-dashed border-indigo-200 focus:border-indigo-500 focus:ring-0 font-bold text-gray-900 p-1 outline-none transition-colors" 
                                  placeholder="Type or select a service" 
                                />
                                {openDropdownIdx === idx && (
                                  <div className="absolute z-50 left-0 top-full mt-2 w-full min-w-[240px] bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden py-2 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                    {services
                                      .filter((s: any) => s.name.toLowerCase().includes((item.description || '').toLowerCase()))
                                      .map((s: any) => (
                                        <button
                                          key={s.id}
                                          type="button"
                                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                          onMouseDown={(e) => {
                                            e.preventDefault(); // Prevent blur
                                            const newItems = [...editData.items];
                                            newItems[idx].description = s.name;
                                            setEditData({...editData, items: newItems});
                                            setOpenDropdownIdx(null);
                                          }}
                                        >
                                          {s.name}
                                        </button>
                                    ))}
                                    {services.filter((s: any) => s.name.toLowerCase().includes((item.description || '').toLowerCase())).length === 0 && (
                                      <div className="px-4 py-3 text-sm text-gray-400 font-medium italic text-center">Press Enter to use custom text</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="font-bold text-gray-900 whitespace-pre-line">{item.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-5 text-center no-print">
                            {isEditing ? (
                              <div className="flex bg-gray-100 p-1 rounded-lg w-fit mx-auto shadow-inner">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newItems = [...editData.items];
                                    newItems[idx].is_service_charge = true;
                                    newItems[idx].is_other_payment = false;
                                    setEditData({...editData, items: newItems});
                                  }}
                                  className={clsx(
                                    "px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all",
                                    item.is_service_charge ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                  )}
                                >
                                  Service
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newItems = [...editData.items];
                                    newItems[idx].is_other_payment = true;
                                    newItems[idx].is_service_charge = false;
                                    setEditData({...editData, items: newItems});
                                  }}
                                  className={clsx(
                                    "px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all",
                                    item.is_other_payment ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                  )}
                                >
                                  Other
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                {item.is_service_charge ? (
                                  <span className="px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    Service
                                  </span>
                                ) : item.is_other_payment ? (
                                  <span className="px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    Other
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-gray-50 text-gray-400 border border-gray-100">
                                    None
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right">
                            {isEditing ? (
                              <input type="number" value={item.quantity} onChange={e => {
                                const newItems = [...editData.items];
                                newItems[idx].quantity = Number(e.target.value);
                                setEditData({...editData, items: newItems});
                              }} className="w-full bg-transparent border-none focus:ring-0 font-bold text-gray-900 p-0 text-right" />
                            ) : (
                              <span className="font-bold text-gray-600">{item.quantity}</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-gray-600">
                             {isEditing ? (
                              <input type="number" value={item.price} onChange={e => {
                                const newItems = [...editData.items];
                                newItems[idx].price = Number(e.target.value);
                                setEditData({...editData, items: newItems});
                              }} className="w-full bg-transparent border-none focus:ring-0 font-bold text-gray-900 p-0 text-right" />
                            ) : (
                              item.price.toLocaleString()
                            )}
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-gray-600">
                             {isEditing ? (
                               <div className="flex items-center justify-end gap-1">
                                 <input type="number" value={item.tax_rate || 0} onChange={e => {
                                   const newItems = [...editData.items];
                                   newItems[idx].tax_rate = Number(e.target.value);
                                   setEditData({...editData, items: newItems});
                                 }} className="w-12 bg-transparent border-none focus:ring-0 font-bold text-gray-900 p-0 text-right" />
                                 <span>%</span>
                               </div>
                             ) : (
                               `${item.tax_rate || 0}%`
                             )}
                          </td>
                          <td className="px-6 py-5 text-right font-black text-gray-900">
                             {(item.quantity * item.price).toLocaleString()}
                          </td>
                          {isEditing && (
                            <td className="px-4 py-5 text-center">
                              <button onClick={() => {
                                const newItems = editData.items.filter((_: any, i: number) => i !== idx);
                                setEditData({...editData, items: newItems});
                              }} className="text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Section */}
                <div className="flex justify-end pt-8">
                   <div className="w-80 space-y-4">
                      <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                         <span>Sub Total</span>
                         <span className="text-gray-900 font-black">Rs. {subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                         <span>Discount</span>
                         {isEditing ? (
                           <input type="number" value={editData.discount} onChange={e => setEditData({...editData, discount: Number(e.target.value)})}
                             className="w-24 bg-gray-50 border-none rounded p-1 text-right font-black text-gray-900 outline-none" />
                         ) : (
                           <span className="text-gray-900 font-black">- Rs. {discount.toLocaleString()}</span>
                         )}
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                         <span>Tax Amount ({(isEditing ? editData?.gst_rate : invoice?.gst_rate) || 0}% GST)</span>
                         {isEditing ? (
                           <input type="number" value={editData.tax_amount !== undefined ? editData.tax_amount : calculatedGst} onChange={e => setEditData({...editData, tax_amount: e.target.value === '' ? undefined : Number(e.target.value)})}
                             className="w-24 bg-gray-50 border-none rounded p-1 text-right font-black text-gray-900 outline-none" />
                         ) : (
                           <span className="text-gray-900 font-black">Rs. {(editData.tax_amount ?? gst).toLocaleString()}</span>
                         )}
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold text-gray-500 pt-4 border-t border-gray-100">
                         <span>Total</span>
                         <span className="text-indigo-600 font-black">Rs. {total.toLocaleString()}</span>
                      </div>
                      {!isEditing && (
                        <>
                          <div className="flex justify-between items-center text-sm font-bold text-gray-500 pt-2">
                             <span>Amount Paid</span>
                             <span className="text-emerald-600 font-black">Rs. {(Number(invoice?.amount_paid) || payments.reduce((s: number, p: any) => s + Number(p.amount), 0)).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm font-bold text-gray-500 pt-2 border-t border-dashed border-gray-200 mt-2">
                             <span>Remaining Balance</span>
                             <span className="text-rose-600 font-black">
                               Rs. {Math.max(0, total - (Number(invoice?.amount_paid) || payments.reduce((s: number, p: any) => s + Number(p.amount), 0))).toLocaleString()}
                             </span>
                          </div>
                        </>
                      )}
                      {user?.role !== 'Client' && editData && (
                        <div className="flex justify-between items-center text-sm font-bold text-indigo-600 bg-indigo-50 p-2 rounded-lg">
                           <div className="flex items-center gap-1.5">
                             <Shield size={14} />
                             <span>Agent Commission</span>
                           </div>
                           <span className="font-black">
                             Rs. {((serviceTotal * (agents.find(a => a.id === (editData.sales_user_id || user?.id))?.commission_percentage || 0)) / 100).toLocaleString()}
                           </span>
                        </div>
                      )}

                      {isEditing && (
                        <div className="pt-8 flex gap-3">
                           <button onClick={() => setIsEditing(false)} className="flex-1 py-3 text-sm font-black text-gray-400 hover:text-gray-600">Cancel</button>
                           <button onClick={handleUpdate} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100">Save Update</button>
                        </div>
                      )}
                   </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-8">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Invoice Total</span>
                    <span className="text-2xl font-black text-gray-900 mt-2">Rs. {total.toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[2px]">Total Paid</span>
                    <span className="text-2xl font-black text-emerald-600 mt-2">
                      Rs. {payments.reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[2px]">Remaining Balance</span>
                    <span className="text-2xl font-black text-rose-600 mt-2">
                      Rs. {Math.max(0, total - payments.reduce((s: number, p: any) => s + Number(p.amount), 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Transaction History</h3>
                      <p className="text-xs font-bold text-gray-400 uppercase">All payment logs recorded for this invoice</p>
                    </div>
                    {user?.role !== 'Client' && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                      >
                        <Plus size={14} />
                        Record Payment
                      </button>
                    )}
                  </div>

                  {payments.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                        <CreditCard size={32} />
                      </div>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-widest">No Payments Recorded</p>
                      <p className="text-xs font-bold text-gray-400 max-w-xs mx-auto uppercase">Click the record button to log a payment.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#F8FAFC] border-b border-gray-100">
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mode</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction ID</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                            {user?.role !== 'Client' && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-20">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {payments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 text-sm font-bold text-gray-700">
                                {new Date(p.payment_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm font-black text-gray-900">
                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold capitalize">
                                  {p.payment_mode}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-500 font-mono">
                                {p.transaction_id || 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                {p.notes || '-'}
                              </td>
                              <td className="px-6 py-4 text-sm font-black text-gray-900 text-right">
                                Rs. {Number(p.amount).toLocaleString()}
                              </td>
                              {user?.role !== 'Client' && (
                                <td className="px-6 py-4 text-center">
                                  {(user?.role === 'Super Admin' || user?.role === 'Accounts') ? (
                                    <button
                                      onClick={() => handleDeletePayment(p.id)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                      title="Delete Payment"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-300 font-bold">No Permission</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Record Payment Modal */}
                {showPaymentModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transform transition-all">
                      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Record Payment</h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Log transaction for INV-{invoice.id?.slice(0, 8)}</p>
                        </div>
                        <button
                          onClick={() => setShowPaymentModal(false)}
                          className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Amount (Rs.)</label>
                          <input
                            type="number"
                            value={paymentData.amount}
                            onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                            placeholder="0.00"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Payment Date</label>
                            <input
                              type="date"
                              value={paymentData.payment_date}
                              onChange={e => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Payment Mode</label>
                            <select
                              value={paymentData.payment_mode}
                              onChange={e => setPaymentData({ ...paymentData, payment_mode: e.target.value })}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none"
                            >
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Cash">Cash</option>
                              <option value="Cheque">Cheque</option>
                              <option value="Online Payment">Online Payment</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Transaction ID / Reference</label>
                          <input
                            type="text"
                            value={paymentData.transaction_id}
                            onChange={e => setPaymentData({ ...paymentData, transaction_id: e.target.value })}
                            placeholder="Optional reference number"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Notes</label>
                          <textarea
                            value={paymentData.notes}
                            onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })}
                            placeholder="Add payment notes..."
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none"
                          />
                        </div>
                      </div>

                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                        <button
                          onClick={() => setShowPaymentModal(false)}
                          className="px-4 py-2 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRecordPayment}
                          disabled={!paymentData.amount}
                          className="px-5 py-2.5 bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                        >
                          Save Transaction
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exact Print Layout matching the user's image */}
      <div className="print-layout print-only bg-white text-black p-8 relative min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="w-1/2">
            <img src="/logo.png" alt="Logo" className="w-64 h-auto object-contain" />
          </div>
          <div className="w-1/2 text-right">
            <div className="text-black font-bold text-sm mb-1">
              Date: {new Date(invoice.created_at || Date.now()).toLocaleDateString('en-GB').replace(/\//g, '-')}
            </div>
            <div className="text-black font-bold text-sm tracking-[4px]">
              ************************
            </div>
          </div>
        </div>

        {/* Invoice Number & Bank Details */}
        <div className="flex justify-between items-start mb-12">
          <div className="w-1/2">
            <div className="font-bold text-black text-[15px]">
              Invoice INV-{invoice.id?.slice(0, 8).toUpperCase()}
            </div>
          </div>
          <div className="w-1/2 text-right text-sm leading-tight space-y-1">
            <div className="font-bold text-black">Account Title: Cadre Management Consultants</div>
            <div className="font-bold text-black">Bank Islami Ltd.</div>
            <div className="font-bold text-black">Gulshan e Iqbal Branch</div>
            <div className="font-bold text-black">Branch Code: 1085</div>
            <div className="font-bold text-black">Account Number: 108500303410001</div>
            <div className="font-bold text-black">IBAN: PK53BKIP0108500303410001</div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-12 text-[15px] text-black leading-tight space-y-1">
          <div className="font-bold">Invoice To,</div>
          <div>{invoice.client_name || invoice.bill_from_name},</div>
          <div className="whitespace-pre-line">{invoice.bill_from_address}</div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-[15px] mb-12">
          <thead>
            <tr className="bg-[#b3b3b3]">
              <th className="border border-black px-4 py-2 text-center font-bold text-black">Description</th>
              <th className="border border-black px-4 py-2 text-center font-bold text-black w-40">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="border border-black px-4 py-2 text-black font-semibold">{item.description}</td>
                <td className="border border-black px-4 py-2 text-center text-black font-semibold">
                  {(item.quantity * item.price).toLocaleString()}
                </td>
              </tr>
            ))}
            {/* Breakdown Rows */}
            {((editData?.tax_amount ?? gst) > 0 || discount > 0) && (
              <tr>
                <td className="border border-black px-4 py-2 font-bold text-black text-right">Sub Total</td>
                <td className="border border-black px-4 py-2 text-center font-bold text-black">{subtotal.toLocaleString()}</td>
              </tr>
            )}
            {discount > 0 && (
              <tr>
                <td className="border border-black px-4 py-2 font-bold text-black text-right">Discount</td>
                <td className="border border-black px-4 py-2 text-center font-bold text-black">- {discount.toLocaleString()}</td>
              </tr>
            )}
            {(editData?.tax_amount ?? gst) > 0 && (
              <tr>
                <td className="border border-black px-4 py-2 font-bold text-black text-right">Tax Amount ({(isEditing ? editData?.gst_rate : invoice?.gst_rate) || 0}% GST)</td>
                <td className="border border-black px-4 py-2 text-center font-bold text-black">{(editData?.tax_amount ?? gst).toLocaleString()}</td>
              </tr>
            )}
            {/* Total Row */}
            <tr className="bg-[#b3b3b3]">
              <td className="border border-black px-4 py-2 font-bold text-black text-right">Total Amount Receivable</td>
              <td className="border border-black px-4 py-2 text-center font-bold text-black">{total.toLocaleString()}</td>
            </tr>
            {totalPaid > 0 && (
              <>
                <tr>
                  <td className="border border-black px-4 py-2 font-bold text-black text-right">Amount Paid</td>
                  <td className="border border-black px-4 py-2 text-center font-bold text-black">{totalPaid.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black px-4 py-2 font-bold text-black text-right">Remaining Balance</td>
                  <td className="border border-black px-4 py-2 text-center font-bold text-black">{remainingAmount.toLocaleString()}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        {/* Prompt Payments */}
        <div className="text-center font-bold text-[#1a5b9b] text-[15px] leading-relaxed mb-32">
          <p>Prompt Payments are Appreciated!</p>
          <p>Thank You</p>
          <p>Accounts Department – Cadre Management Consultants</p>
        </div>

        {/* Footer */}
        <div className="absolute bottom-10 left-8 right-8">
          <div className="border-t-[3px] border-black pt-2 mt-4 text-center text-[12px] text-black">
            <p className="font-bold">CADRE MANAGEMENT CONSULTANTS | Office No. R-57, Block-6, Gulshan e Iqbal, Karachi</p>
            <p className="font-semibold">Contact No. +92 21 34804881 | +92 332 2237322 | Email: accounts@cadre-consultants.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;
