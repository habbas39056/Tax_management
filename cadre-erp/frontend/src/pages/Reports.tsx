import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Briefcase, FileText, ChevronDown, ChevronUp, DollarSign, Activity, Calendar, ShieldCheck, ArrowRight, Search
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'clients' | 'agents'>('clients');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [clients, setClients] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const [clientsRes, staffRes, invoicesRes, projectsRes] = await Promise.all([
          api.get('/clients'),
          api.get('/users/staff'),
          api.get('/finance/invoices'),
          api.get('/projects')
        ]);
        
        setClients(clientsRes.data);
        setAgents(staffRes.data.filter((u: any) => u.role_name === 'Sales'));
        setInvoices(invoicesRes.data);
        setProjects(projectsRes.data);
      } catch (e) {
        toast.error('Failed to load reports data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReportsData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-bold">Loading Reports...</div>;
  }

  const filteredClients = clients.filter(c => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const nameMatch = c.full_name?.toLowerCase().includes(search);
    return nameMatch;
  });

  const filteredAgents = agents.filter(a => {
    if (!searchQuery) return true;
    return a.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="animate-fade space-y-8">
      <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Reports</h2>
          <p className="text-gray-500 mt-1">Comprehensive overview of clients and sales agents</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3">
        <Search className="text-gray-400 ml-2" size={20} />
        <input 
          type="text" 
          placeholder="Search by name or company..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none font-medium text-gray-700"
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => { setActiveTab('clients'); setSearchQuery(''); }}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'clients' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Client Reports
          </button>
          <button 
            onClick={() => { setActiveTab('agents'); setSearchQuery(''); }}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'agents' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Sales Agent Reports
          </button>
        </div>

        <div className="p-6 space-y-4 bg-gray-50/30 min-h-[500px]">
          {activeTab === 'clients' && (
            <div className="space-y-4">
              {filteredClients.map(client => {
                const clientInvoices = invoices.filter(inv => inv.client_id === client.id);
                const totalBilled = clientInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
                const dueBalance = clientInvoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

                return (
                  <div key={client.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {client.full_name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900">{client.full_name}</h3>
                          <p className="text-sm font-bold text-gray-500">{client.whatsapp_number} • {client.cnic}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right hidden md:block">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Due Balance</p>
                          <p className="text-sm font-bold text-red-500">Rs. {dueBalance.toLocaleString()}</p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Billed</p>
                          <p className="text-sm font-bold text-gray-900">Rs. {totalBilled.toLocaleString()}</p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoices</p>
                          <p className="text-sm font-bold text-gray-900">{clientInvoices.length}</p>
                        </div>
                        <button 
                          onClick={() => navigate(`/reports/client/${client.id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-sm font-bold transition-all"
                        >
                          View Detailed Report <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredClients.length === 0 && <p className="text-center text-gray-500 py-12">No clients found.</p>}
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-4">
              {filteredAgents.map(agent => {
                const agentInvoices = invoices.filter(inv => inv.sales_user_id === agent.id);
                
                const totalSales = agentInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
                const totalServiceCharges = agentInvoices.reduce((sum, inv) => sum + Number(inv.service_charges_total || 0), 0);
                const totalCommission = (totalServiceCharges * (agent.commission_percentage || 0)) / 100;

                return (
                  <div key={agent.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg">
                          {agent.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900">{agent.name}</h3>
                          <p className="text-sm font-bold text-gray-500">Commission Rate: <span className="text-emerald-600">{agent.commission_percentage || 0}%</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right hidden md:block">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Sales</p>
                          <p className="text-sm font-bold text-gray-900">Rs. {totalSales.toLocaleString()}</p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Est. Commission</p>
                          <p className="text-sm font-bold text-emerald-600">Rs. {totalCommission.toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={() => navigate(`/reports/agent/${agent.id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-sm font-bold transition-all"
                        >
                          View Detailed Report <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredAgents.length === 0 && <p className="text-center text-gray-500 py-12">No sales agents found.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
