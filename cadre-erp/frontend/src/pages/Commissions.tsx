import React, { useState, useEffect } from 'react';
import { DollarSign, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

const Commissions: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sales' | 'project'>('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchCommissions = async () => {
      try {
        const [staffRes, invoicesRes, stepInvRes, clientsRes] = await Promise.all([
          api.get('/users/staff'),
          api.get('/finance/invoices'),
          api.get('/projects/steps/all-assigned-invoices').catch(() => ({ data: [] })),
          api.get('/clients')
        ]);

        const staff = staffRes.data;
        const invoices = invoicesRes.data;
        const stepInvoices = stepInvRes.data;
        const clients = clientsRes.data;

        let allCommissions: any[] = [];

        // 1. Process Sales Commissions
        invoices.forEach((inv: any) => {
          if (inv.sales_user_id) {
            const agent = staff.find((s: any) => s.id === inv.sales_user_id);
            if (agent) {
              const baseAmount = Number(inv.service_charges_total || 0);
              const rate = Number(agent.commission_percentage || 0);
              const earned = (baseAmount * rate) / 100;
              const client = clients.find((c: any) => c.id === inv.client_id);

              if (earned > 0) {
                allCommissions.push({
                  id: `sales-${inv.id}-${agent.id}`,
                  date: inv.created_at,
                  agentName: agent.name,
                  agentId: agent.id,
                  clientName: client?.full_name || 'Unknown Client',
                  source: `Invoice #${inv.id}`,
                  type: 'Sales Commission',
                  baseAmount: baseAmount,
                  rate: rate,
                  earned: earned,
                  status: inv.status
                });
              }
            }
          }
        });

        // 2. Process Project Commissions
        stepInvoices.forEach((stepInv: any) => {
          if (stepInv.assigned_user_id) {
            const agent = staff.find((s: any) => s.id === stepInv.assigned_user_id);
            if (agent) {
              const baseAmount = Number(stepInv.service_charges_total || 0);
              const rate = 5; // Flat 5% for project
              const earned = (baseAmount * rate) / 100;
              
              if (earned > 0) {
                allCommissions.push({
                  id: `project-${stepInv.step_id}-${stepInv.invoice_id}-${agent.id}`,
                  date: stepInv.created_at,
                  agentName: agent.name,
                  agentId: agent.id,
                  clientName: stepInv.client_name || 'Unknown Client',
                  source: `Project: ${stepInv.project_title} (Step: ${stepInv.step_title})`,
                  type: 'Project Commission',
                  baseAmount: baseAmount,
                  rate: rate,
                  earned: earned,
                  status: stepInv.status
                });
              }
            }
          }
        });

        if (user?.role === 'Sales') {
          allCommissions = allCommissions.filter(c => c.agentId === user.id);
        }

        // Sort by date descending
        allCommissions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCommissions(allCommissions);

      } catch (error) {
        toast.error('Failed to load commissions');
      } finally {
        setLoading(false);
      }
    };

    fetchCommissions();
  }, [user?.id, user?.role]);

  const filteredCommissions = commissions.filter(c => {
    // Type Filter
    if (filterType === 'sales' && c.type !== 'Sales Commission') return false;
    if (filterType === 'project' && c.type !== 'Project Commission') return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.agentName.toLowerCase().includes(q) || c.clientName.toLowerCase().includes(q) || c.source.toLowerCase().includes(q);
    }

    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  const totalPages = Math.ceil(filteredCommissions.length / itemsPerPage);
  const paginatedCommissions = filteredCommissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalEarned = filteredCommissions.reduce((sum, c) => sum + c.earned, 0);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-bold">Loading Commissions...</div>;
  }

  return (
    <div className="animate-fade space-y-8">
      <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Commissions Module</h2>
          <p className="text-gray-500 mt-1">Track and manage all team member commissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Filtered Commissions</p>
          <p className="text-3xl font-black text-emerald-600">Rs. {totalEarned.toLocaleString()}</p>
        </div>
        
        <div className="col-span-2 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 flex items-center bg-gray-50 rounded-2xl px-4 py-3 w-full border border-gray-100 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
            <Search className="text-gray-400 mr-3" size={20} />
            <input 
              type="text" 
              placeholder="Search by agent, client, or source..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-gray-800 font-medium w-full placeholder-gray-400"
            />
          </div>
          
          <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100 w-full sm:w-auto">
            <button 
              onClick={() => setFilterType('all')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${filterType === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilterType('sales')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${filterType === 'sales' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sales
            </button>
            <button 
              onClick={() => setFilterType('project')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${filterType === 'project' ? 'bg-fuchsia-50 text-fuchsia-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Project
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th scope="col" className="py-4 pl-6 pr-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Date & Team Member</th>
                <th scope="col" className="px-3 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Client & Source</th>
                <th scope="col" className="px-3 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">Commission Type</th>
                <th scope="col" className="px-3 py-4 text-right text-[11px] font-black text-gray-400 uppercase tracking-wider">Base Amount</th>
                <th scope="col" className="px-3 py-4 text-right text-[11px] font-black text-gray-400 uppercase tracking-wider">Rate</th>
                <th scope="col" className="px-6 py-4 text-right text-[11px] font-black text-emerald-500 uppercase tracking-wider">Earned</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {paginatedCommissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400 font-medium">
                    No commissions found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 pl-6 pr-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                          {comm.agentName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{comm.agentName}</div>
                          <div className="text-xs font-semibold text-gray-500">{new Date(comm.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{comm.clientName}</div>
                      <div className="text-xs font-semibold text-gray-500 truncate max-w-[250px]">{comm.source}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black tracking-wide ${comm.type === 'Sales Commission' ? 'bg-indigo-50 text-indigo-700' : 'bg-fuchsia-50 text-fuchsia-700'}`}>
                        {comm.type}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-gray-600">Rs. {comm.baseAmount.toLocaleString()}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-gray-600">{comm.rate}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-black text-emerald-600">Rs. {comm.earned.toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredCommissions.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      </div>
    </div>
  );
};

export default Commissions;
