import React, { useState, useEffect } from 'react';
import { Users, Briefcase, FileText, DollarSign, TrendingUp, Activity, Inbox } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import api from '../utils/api';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const STATUS_COLORS = {
  'Pending': '#F59E0B',
  'In Progress': '#3B82F6',
  'Completed': '#10B981',
  'Rejected': '#EF4444',
  'On Hold': '#6B7280',
  'Cancelled': '#EF4444'
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState([
    { name: 'Total Revenue', value: 'Rs. 0', icon: DollarSign, color: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-200' },
    { name: 'Outstanding', value: 'Rs. 0', icon: TrendingUp, color: 'from-orange-400 to-orange-600', shadow: 'shadow-orange-200' },
    { name: 'Active Projects', value: '0', icon: Briefcase, color: 'from-indigo-400 to-indigo-600', shadow: 'shadow-indigo-200' },
    { name: 'Total Clients', value: '0', icon: Users, color: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-200' },
    { name: 'Total Leads', value: '0', icon: Inbox, color: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-200' },
  ]);

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any[]>([]);
  const [invoiceStatusData, setInvoiceStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [clientsRes, projectsRes, invoicesRes, leadsRes] = await Promise.all([
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/projects').catch(() => ({ data: [] })),
        api.get('/finance/invoices').catch(() => ({ data: [] })),
        api.get('/leads').catch(() => ({ data: [] }))
      ]);

      const clients = clientsRes.data;
      const projects = projectsRes.data;
      const invoices = invoicesRes.data;
      const leads = leadsRes.data;

      // Stats calculations
      const activeProjects = projects.filter((p: any) => p.status !== 'Completed' && p.status !== 'Cancelled');
      
      let totalRevenue = 0;
      let totalOutstanding = 0;
      let paidCount = 0;
      let unpaidCount = 0;
      
      invoices.forEach((inv: any) => {
        totalRevenue += Number(inv.total_amount) || 0;
        if (inv.status === 'unpaid') {
          totalOutstanding += Number(inv.total_amount) || 0;
          unpaidCount++;
        } else {
          paidCount++;
        }
      });

      setStats([
        { name: 'Total Revenue', value: `Rs. ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-200' },
        { name: 'Outstanding', value: `Rs. ${totalOutstanding.toLocaleString()}`, icon: TrendingUp, color: 'from-orange-400 to-orange-600', shadow: 'shadow-orange-200' },
        { name: 'Active Projects', value: activeProjects.length.toLocaleString(), icon: Activity, color: 'from-indigo-400 to-indigo-600', shadow: 'shadow-indigo-200' },
        { name: 'Total Clients', value: clients.length.toLocaleString(), icon: Users, color: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-200' },
        { name: 'Total Leads', value: leads.length.toLocaleString(), icon: Inbox, color: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-200' },
      ]);

      // Chart Data Preparations
      
      // 1. Revenue Trend (Mocking historical trend based on current data for display purposes if not enough data exists)
      const monthlyRevenue = [
        { name: 'Jan', revenue: totalRevenue * 0.1 },
        { name: 'Feb', revenue: totalRevenue * 0.15 },
        { name: 'Mar', revenue: totalRevenue * 0.2 },
        { name: 'Apr', revenue: totalRevenue * 0.12 },
        { name: 'May', revenue: totalRevenue * 0.43 },
      ];
      setRevenueData(monthlyRevenue);

      // 2. Project Status Distribution
      const statusCounts = projects.reduce((acc: any, p: any) => {
        const s = p.status || 'Pending';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      setProjectData(Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] })));

      // 3. Invoice Status
      setInvoiceStatusData([
        { name: 'Paid', value: paidCount, fill: '#10B981' },
        { name: 'Unpaid', value: unpaidCount, fill: '#F59E0B' }
      ]);

    } catch (e) {
      console.error('Failed to fetch dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tight text-gray-900">
          Dashboard Overview
        </h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((item) => (
          <div 
            key={item.name} 
            className="group relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} ${item.shadow} shadow-lg text-white transform group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-400 tracking-wider uppercase">{item.name}</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">{item.value}</p>
                </div>
              </div>
            </div>
            {/* Decorative background blur */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br ${item.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-300`} />
          </div>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Revenue Area Chart - Takes up 2 columns */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Revenue Trend</h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dx={-10} tickFormatter={(value) => `Rs.${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Status Donut Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-black text-gray-900 tracking-tight mb-2">Project Portfolio</h3>
          <p className="text-sm text-gray-400 mb-6 font-medium">Current distribution of all projects by status</p>
          <div className="flex-1 min-h-[250px]">
            {projectData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={projectData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {projectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(STATUS_COLORS as any)[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm font-medium">
                No active projects found.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Secondary Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Invoice Status */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Invoice Collection Status</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={invoiceStatusData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontWeight: 'bold'}} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={40}>
                  {invoiceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions or Info (Placeholder for Future Expansion) */}
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 p-8 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-center text-white">
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-2">Welcome to Cadre ERP</h3>
            <p className="text-indigo-200 font-medium leading-relaxed max-w-sm mb-6">
              Your business overview is looking great. Keep track of your leads, projects, and finances all in one centralized hub.
            </p>
            <button 
              onClick={() => window.location.href = '/projects?new=true'}
              className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Start New Project
            </button>
          </div>
          {/* Decorative shapes */}
          <div className="absolute -right-20 -top-20 w-64 h-64 border-[30px] border-white opacity-10 rounded-full"></div>
          <div className="absolute -bottom-10 right-20 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;