import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Briefcase, ChevronRight, LayoutGrid, List, CheckCircle, Clock, Timer } from 'lucide-react';
import clsx from 'clsx';

interface Project {
  id: string;
  title: string;
  status: 'active' | 'on_hold' | 'completed';
  service_name: string;
  total_steps: number;
  completed_steps: number;
}

const ClientProjects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/portal/projects').then(r => setProjects(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const active = projects.filter(p => p.status === 'active').length;
  const completed = projects.filter(p => p.status === 'completed').length;

  return (
    <div className="animate-fade">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-outfit">My Project Portfolio</h1>
          <p className="text-gray-500 mt-1 font-medium">Real-time status of your active service requests</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm self-start">
           <button className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><LayoutGrid size={18} /></button>
           <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600"><List size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="cp-stat relative group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Projects</p>
              <p className="text-2xl font-black text-gray-900">{projects.length}</p>
            </div>
          </div>
        </div>
        <div className="cp-stat relative group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Timer size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Lifecycle</p>
              <p className="text-2xl font-black text-emerald-600">{active}</p>
            </div>
          </div>
        </div>
        <div className="cp-stat relative group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completed</p>
              <p className="text-2xl font-black text-blue-600">{completed}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-gray-400">Synchronizing lifecycles...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-dashed border-gray-200 p-20 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase size={40} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Projects</h3>
          <p className="text-gray-500 max-w-sm mx-auto">You don't have any projects assigned to your account at the moment.</p>
        </div>
      ) : (
        <div className="cp-project-cards">
          {projects.map((p, i) => {
            const pct = p.total_steps > 0 ? Math.round((p.completed_steps / p.total_steps) * 100) : 0;
            return (
              <div key={p.id} 
                className={clsx(
                  "cp-project-card group",
                  p.status === 'active' && "cp-project-card--active",
                  p.status === 'completed' && "cp-project-card--completed",
                  p.status === 'on_hold' && "cp-project-card--on_hold"
                )} 
                onClick={() => navigate(`/portal/projects/${p.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="cp-project-card__title group-hover:text-indigo-600 transition-colors">{p.title}</h3>
                    <p className="cp-project-card__service mt-1">{p.service_name}</p>
                  </div>
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    p.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 
                    p.status === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                  )}>
                    {p.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between items-end mb-2">
                    <span className="cp-project-card__progress-label">Milestone Progress</span>
                    <span className="cp-project-card__progress-value">{pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={clsx(
                        "h-full rounded-full transition-all duration-1000 ease-out",
                        p.status === 'completed' ? 'bg-indigo-600' : 'bg-emerald-500'
                      )} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                  <p className="mt-3 text-[11px] font-bold text-gray-400">
                    {p.completed_steps} of {p.total_steps} milestones verified
                  </p>
                </div>

                <div className="cp-project-card__footer">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#{p.id.substring(0, 8)}</span>
                  <div className="flex items-center gap-1 text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    View Details <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientProjects;
