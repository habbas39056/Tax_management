import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Briefcase, Download, Filter, Pencil } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ClientReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [client, setClient] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientRes, invRes, projRes] = await Promise.all([
          api.get('/clients'),
          api.get('/finance/invoices'),
          api.get('/projects')
        ]);
        
        const foundClient = clientRes.data.find((c: any) => String(c.id) === String(id));
        setClient(foundClient);
        setInvoices(invRes.data.filter((i: any) => String(i.client_id) === String(id)));
        setProjects(projRes.data.filter((p: any) => String(p.client_id) === String(id)));
      } catch (e) {
        toast.error('Failed to load client report');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Loading Report...</div>;
  if (!client) return <div className="p-8 text-center text-red-500 font-bold">Client not found</div>;

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const dueBalance = invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  // Apply Filters to Invoices
  let filteredInvoices = [...invoices];
  if (statusFilter !== 'all') {
    filteredInvoices = filteredInvoices.filter(i => i.status === statusFilter);
  }
  if (dateFilter) {
    filteredInvoices = filteredInvoices.filter(i => new Date(i.created_at).toISOString().split('T')[0] === dateFilter);
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
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{client.full_name} Report</h2>
          <p className="text-gray-500 mt-1">{client.whatsapp_number} • {client.cnic}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Billed</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">Rs. {totalBilled.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
            <FileText size={20} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Due Balance</p>
            <p className="text-2xl font-black text-red-600 mt-1">Rs. {dueBalance.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Invoices</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{invoices.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Projects</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{projects.length}</p>
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
            <option value="all">All Statuses</option>
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

        {/* Invoice History */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
             <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><FileText className="text-indigo-600" size={20} /> Invoice History</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Invoice ID</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Date</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Amount</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Status</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInvoices.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-gray-400 text-center font-medium">No invoices match filters</td></tr>
              ) : filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono">
                    <button 
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="text-indigo-600 hover:underline font-bold focus:outline-none"
                    >
                      #{inv.id.slice(0, 8).toUpperCase()}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-black text-gray-900">Rs. {Number(inv.total_amount).toLocaleString()}</td>
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Project History */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
             <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Briefcase className="text-indigo-600" size={20} /> Projects & Documents</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Project Title</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Service</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-gray-400 text-center font-medium">No projects found</td></tr>
              ) : projects.map(proj => (
                <tr key={proj.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{proj.title}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{proj.service_name || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-[10px] font-bold uppercase bg-blue-50 text-blue-600 rounded-md">
                      {proj.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default ClientReportDetail;
