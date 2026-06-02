import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Download, Filter, Pencil, Users, FileText } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AgentReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [agent, setAgent] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staffRes, clientsRes, invRes] = await Promise.all([
          api.get('/users/staff'),
          api.get('/clients'),
          api.get('/finance/invoices')
        ]);

        const currentAgent = staffRes.data.find((u: any) => String(u.id) === String(id));
        if (currentAgent) {
          setAgent(currentAgent);
        } else {
          toast.error('Agent not found');
        }
        setClients(clientsRes.data.filter((c: any) => String(c.sales_agent_id) === String(id)));
        setInvoices(invRes.data.filter((i: any) => String(i.sales_user_id) === String(id)));
      } catch (e: any) {
        console.error('Fetch error:', e);
        if (e.response?.status === 401) {
          toast.error('Authentication failed. Please login again.');
        } else if (e.response?.status === 404) {
          toast.error('API endpoint not found. Please check server configuration.');
        } else if (e.code === 'ECONNABORTED') {
          toast.error('Request timeout. Please try again.');
        } else if (!e.response) {
          toast.error('Network error. Please check if the server is running.');
        } else {
          toast.error('Failed to load agent report');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Loading Report...</div>;
  if (!agent) return <div className="p-8 text-center text-red-500 font-bold">Sales Agent not found</div>;

  const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalServiceCharges = invoices.reduce((sum, inv) => sum + Number(inv.service_charges_total || 0), 0);
  const totalCommission = (totalServiceCharges * (agent.commission_percentage || 0)) / 100;

  // Apply Filters to Invoices
  let filteredInvoices = [...invoices];
  if (statusFilter !== 'all') {
    filteredInvoices = filteredInvoices.filter(i => i.status === statusFilter);
  }
  if (dateFilter) {
    filteredInvoices = filteredInvoices.filter(i => {
      const invoiceDate = new Date(i.created_at).toISOString().split('T')[0];
      return invoiceDate === dateFilter;
    });
  }

  const handleDownloadInvoice = (invId: string) => {
    toast.success('Preparing invoice download...');
    navigate(`/invoices/${invId}?print=true`);
  };

  return (
    <div className="animate-fade space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/reports')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{agent.name} Report</h2>
          <p className="text-emerald-600 font-bold mt-1">Commission Rate: {agent.commission_percentage || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Sales</p>
            <p className="text-2xl font-black text-gray-900 mt-1">Rs. {totalSales.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Est. Commission</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">Rs. {totalCommission.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <DollarSign size={20} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Clients</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{clients.length}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm items-center">
          <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
            <Filter size={16} /> Filters:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-gray-200 rounded-lg text-sm font-bold bg-gray-50 px-4 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Invoices</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border-gray-200 rounded-lg text-sm font-bold bg-gray-50 px-4 py-2 outline-none focus:border-indigo-500"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="text-xs font-bold text-red-500 hover:underline">Clear Date</button>
          )}
        </div>

        {/* Detailed Invoices and Commissions */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><FileText className="text-emerald-600" size={20} /> Agent Sales & Commission Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Invoice ID</th>
                  <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Client</th>
                  <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Sale Amount</th>
                  <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Commission</th>
                  <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Status</th>
                  <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-gray-400 text-center font-medium">No sales found matching criteria</td></tr>
                ) : (
                  filteredInvoices.map(inv => {
                    const clientObj = clients.find(c => c.id === inv.client_id);
                    const invComm = (Number(inv.service_charges_total || 0) * (agent.commission_percentage || 0)) / 100;

                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono">
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="text-indigo-600 hover:underline font-bold focus:outline-none"
                          >
                            #{inv.id.slice(0, 8).toUpperCase()}
                          </button>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">{clientObj?.full_name || 'Unknown'}</td>
                        <td className="px-6 py-4 font-black text-gray-600">Rs. {Number(inv.total_amount).toLocaleString()}</td>
                        <td className="px-6 py-4 font-black text-emerald-600">Rs. {invComm.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md ${inv.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 transition-colors bg-gray-50 rounded-lg inline-flex items-center"
                            title="Edit Invoice"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDownloadInvoice(inv.id)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center"
                            title="Download Invoice"
                          >
                            <Download size={16} />
                          </button>
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
    </div>
  );
};

export default AgentReportDetail;