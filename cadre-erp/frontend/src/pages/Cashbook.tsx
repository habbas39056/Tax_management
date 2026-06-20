import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, BookOpen, Building2, DollarSign, FileText, AlertCircle, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

interface CashbookEntry {
  id: string;
  entry_date: string;
  party_client: string;
  description: string;
  payment_mode: string;
  bank: string;
  reference_number: string;
  receipt: string | number;
  payment: string | number;
  balance: string | number;
  created_at?: string;
  source?: string;
  displayBalance?: number;
}

interface Bank {
  id: string;
  name: string;
  account_number: string;
  branch: string;
}

const Cashbook: React.FC = () => {
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: 'Payment', // 'Payment' or 'Receipt'
    party_client: '',
    amount: '',
    description: '',
    payment_mode: 'Cash',
    bank: '',
    reference_number: '',
    source: 'cashbook'
  });

  const [bankFormData, setBankFormData] = useState({
    name: '',
    account_number: '',
    branch: ''
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [entriesRes, banksRes, invoicesRes, clientsRes] = await Promise.all([
        api.get('/cashbook'),
        api.get('/banks'),
        api.get('/finance/invoices'),
        api.get('/clients')
      ]);
      setEntries(entriesRes.data);
      setBanks(banksRes.data);
      setInvoices(invoicesRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // If mode changes to Cash, clear bank field
      if (name === 'payment_mode' && value === 'Cash') {
        updated.bank = '';
      }
      return updated;
    });
  };

  const handleBankInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBankFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateBalance = (entriesList: CashbookEntry[], currentEntryIndex: number, newReceipt: number, newPayment: number) => {
    let prevBalance = 0;
    if (currentEntryIndex > 0 && entriesList[currentEntryIndex - 1]) {
      prevBalance = parseFloat(entriesList[currentEntryIndex - 1].balance as string) || 0;
    } else if (entriesList.length > 0) {
      prevBalance = parseFloat(entriesList[0].balance as string) || 0;
    }
    return prevBalance + newReceipt - newPayment;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amountVal = parseFloat(formData.amount as string) || 0;
      const receiptAmt = formData.entry_type === 'Receipt' ? amountVal : 0;
      const paymentAmt = formData.entry_type === 'Payment' ? amountVal : 0;

      const payload = {
        ...formData,
        receipt: receiptAmt,
        payment: paymentAmt,
        balance: calculateBalance(entries, entries.length, receiptAmt, paymentAmt)
      };

      if (editingId) {
        await api.put(`/cashbook/${editingId}`, payload);
        toast.success('Entry updated successfully');
      } else {
        await api.post('/cashbook', payload);
        toast.success('Entry added successfully');
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save entry');
    }
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBankId) {
        await api.put(`/banks/${editingBankId}`, bankFormData);
        toast.success('Bank updated successfully');
      } else {
        await api.post('/banks', bankFormData);
        toast.success('Bank created successfully');
      }
      setBankFormData({ name: '', account_number: '', branch: '' });
      setEditingBankId(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save bank');
    }
  };

  const handleEdit = (entry: CashbookEntry) => {
    const isReceipt = parseFloat(entry.receipt?.toString() || '0') > 0;
    const amountVal = isReceipt ? entry.receipt : entry.payment;

    setFormData({
      entry_date: entry.entry_date ? new Date(entry.entry_date).toISOString().split('T')[0] : '',
      entry_type: isReceipt ? 'Receipt' : 'Payment',
      party_client: entry.party_client || '',
      amount: amountVal?.toString() || '',
      description: entry.description || '',
      payment_mode: entry.payment_mode,
      bank: entry.bank || '',
      reference_number: entry.reference_number || '',
      source: entry.source || 'cashbook'
    });
    setEditingId(entry.id);
    setShowModal(true);
  };

  const handleEditBank = (bank: Bank) => {
    setBankFormData({
      name: bank.name,
      account_number: bank.account_number || '',
      branch: bank.branch || ''
    });
    setEditingBankId(bank.id);
  };

  const handleDelete = async (id: string, source: string = 'cashbook') => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/cashbook/${id}?source=${source}`);
      toast.success('Entry deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bank? Entries linked to this bank will just keep the name text.')) return;
    try {
      await api.delete(`/banks/${id}`);
      toast.success('Bank deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete bank');
    }
  };

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'Payment',
      party_client: '',
      amount: '',
      description: '',
      payment_mode: 'Cash',
      bank: '',
      reference_number: '',
      source: 'cashbook'
    });
  };

  let currentBalance = 0;
  const entriesWithBalance = [...entries].reverse().map(entry => {
    const receipt = parseFloat(entry.receipt as string) || 0;
    const payment = parseFloat(entry.payment as string) || 0;
    currentBalance = currentBalance + receipt - payment;
    return { ...entry, displayBalance: currentBalance };
  }).reverse();

  const displayEntries = entriesWithBalance.filter(entry =>
    entry.party_client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.bank?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate Stats
  const totalExpenses = entries.reduce((sum, entry) => sum + (parseFloat(entry.payment as string) || 0), 0);
  const otherExpenses = entries
    .filter(entry => !entry.party_client || entry.party_client.trim() === '')
    .reduce((sum, entry) => sum + (parseFloat(entry.payment as string) || 0), 0);
  const totalReceipts = entries.reduce((sum, entry) => sum + (parseFloat(entry.receipt as string) || 0), 0);
  const totalNetBalance = totalReceipts - totalExpenses;

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const unpaidInvoices = invoices.reduce((sum, inv) => sum + Math.max(0, Number(inv.total_amount) - (Number(inv.amount_paid) || 0)), 0);

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          nav, sidebar, header, .no-print, [role="navigation"], .sidebar {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-only {
            display: block !important;
          }
          /* Override MainLayout strict heights to allow multiple pages */
          .h-screen {
            height: auto !important;
          }
          .overflow-hidden {
            overflow: visible !important;
          }
          .overflow-y-auto, .overflow-x-auto {
            overflow: visible !important;
          }
          main {
            overflow: visible !important;
          }
          
          /* Excel-like Report Styling */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            border: 1px solid #000 !important;
          }
          th, td {
            border: 1px solid #000 !important;
            color: #000 !important;
            padding: 8px !important;
            font-size: 11px !important;
          }
          th {
            background-color: #e5e7eb !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-weight: bold !important;
          }
          tr {
            page-break-inside: avoid;
          }
          .divide-y > tr {
            border-top: none !important;
          }
        }
      `}</style>

      {/* Print Header */}
      <div className="hidden print-only mb-8 mt-4">
        <div className="flex justify-between items-end mb-6 border-b-2 border-black pb-4">
          <div className="w-1/2">
            <img src="/logo.png" alt="Logo" className="w-[250px] h-auto object-contain -ml-4" />
          </div>
          <div className="w-1/2 flex flex-col justify-end text-right">
            <h1 className="text-2xl font-black uppercase text-black mb-1">Cashbook Report</h1>
            <div className="text-black text-[13px] font-semibold">
              Generated On: {new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Other Expenses</p>
            <h3 className="text-xl font-extrabold text-gray-900">PKR {otherExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Net Balance</p>
            <h3 className="text-xl font-extrabold text-gray-900">PKR {totalNetBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-cyan-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Invoiced</p>
            <h3 className="text-xl font-extrabold text-cyan-600">PKR {totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Unpaid Invoices</p>
            <h3 className="text-xl font-extrabold text-rose-600">PKR {unpaidInvoices.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>
      </div>

      {banks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
          {banks.map(bank => {
            const bankEntries = entries.filter(e => e.bank === bank.name);
            const bankBalance = bankEntries.reduce((sum, e) => sum + (parseFloat(e.receipt as string) || 0) - (parseFloat(e.payment as string) || 0), 0);

            return (
              <div key={bank.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm line-clamp-1">
                  <Building2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  {bank.name}
                </div>
                <div className="text-xl font-extrabold text-slate-900">
                  PKR {bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print-full-width">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 no-print">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors shadow-sm justify-center font-medium"
            >
              <Printer size={20} />
              Download PDF
            </button>
            <button
              onClick={() => setShowBankModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm justify-center font-medium"
            >
              <Building2 size={20} />
              Manage Banks
            </button>
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm justify-center font-medium"
            >
              <Plus size={20} />
              Add Entry
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Party/Client</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mode</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bank/Ref</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Receipt</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Payment</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Balance</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  </td>
                </tr>
              ) : displayEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No entries found
                  </td>
                </tr>
              ) : (
                displayEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(entry.entry_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {entry.party_client}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={entry.description}>
                      {entry.description}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${entry.payment_mode !== 'Cash' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                        }`}>
                        {entry.payment_mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {entry.bank && <div>{entry.bank}</div>}
                      {entry.reference_number && <div className="text-xs text-gray-400">Ref: {entry.reference_number}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600 text-right">
                      {parseFloat(entry.receipt as string) > 0 ? `Rs. ${parseFloat(entry.receipt as string).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">
                      {parseFloat(entry.payment as string) > 0 ? `Rs. ${parseFloat(entry.payment as string).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      Rs. {entry.displayBalance?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right no-print">
                      <div className="flex justify-end gap-2 items-center">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id, entry.source)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-[600px] min-h-[600px] flex flex-col shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Entry' : 'Add Entry'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 text-xl font-light">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Date *</label>
                <input
                  type="date"
                  name="entry_date"
                  required
                  value={formData.entry_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Entry Type *</label>
                <select
                  name="entry_type"
                  value={formData.entry_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="Payment">Payment (Expense / Cash Out)</option>
                  <option value="Receipt">Receipt (Income / Cash In)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Client / Party (Optional)</label>
                <select
                  name="party_client"
                  value={formData.party_client}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">- General Expense / No Client -</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.full_name}>{c.full_name}</option>
                  ))}
                </select>
                {formData.party_client && (() => {
                  const clientInvoices = invoices.filter(inv => inv.client_name === formData.party_client);
                  const totalInv = clientInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
                  const remaining = clientInvoices.reduce((sum, inv) => sum + Math.max(0, Number(inv.total_amount) - (Number(inv.amount_paid) || 0)), 0);

                  return (
                    <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center">
                      <div className="text-xs text-slate-500">
                        Total Invoiced: <span className="font-bold text-slate-800">PKR {totalInv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Remaining Balance: <span className={`font-bold ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>PKR {remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Amount *</label>
                <input
                  type="number"
                  name="amount"
                  required
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Details about this entry"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mode</label>
                <select
                  name="payment_mode"
                  value={formData.payment_mode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              {formData.payment_mode !== 'Cash' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Bank Name</label>
                  <select
                    name="bank"
                    value={formData.bank}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="">Select Bank...</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Reference #</label>
                <input
                  type="text"
                  name="reference_number"
                  value={formData.reference_number}
                  onChange={handleInputChange}
                  placeholder="Check #, Transaction ID"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-auto border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#F05A28] text-white rounded-lg hover:bg-[#d94b1f] transition-colors"
                >
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBankModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-slate-800">
                Manage Banks
              </h2>
              <button onClick={() => setShowBankModal(false)} className="text-gray-400 hover:text-gray-900 text-xl font-light">
                ✕
              </button>
            </div>

            <div className="space-y-0 mb-6">
              {banks.map(bank => (
                <div key={bank.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0 group">
                  <span className="text-slate-800 font-medium">{bank.name}</span>
                  <button
                    onClick={() => handleDeleteBank(bank.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {banks.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">No banks added yet.</div>
              )}
            </div>

            <form onSubmit={handleBankSubmit} className="flex gap-3 pt-4 border-t border-gray-100">
              <input
                type="text"
                name="name"
                required
                value={bankFormData.name}
                onChange={handleBankInputChange}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="New Bank Name"
              />
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-bold bg-[#F05A28] text-white rounded-lg hover:bg-[#d94b1f] transition-colors"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cashbook;
