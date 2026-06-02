import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, CreditCard, Briefcase, FolderOpen, 
  StickyNote, ArrowRight, TrendingUp, Clock, 
  AlertCircle, CheckCircle2 
} from 'lucide-react';

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    invoices: 0, 
    payments: 0, 
    projects: 0, 
    files: 0, 
    notes: 0, 
    outstanding: 0,
    activeProjects: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/portal/invoices'),
      api.get('/portal/payments'),
      api.get('/portal/projects'),
      api.get('/portal/files'),
      api.get('/portal/notes'),
    ]).then(([inv, pay, proj, fil, not]) => {
      const outstanding = (inv.data || []).reduce((a: number, i: any) => a + (Number(i.total_amount) - Number(i.amount_paid)), 0);
      const activeProjects = (proj.data || []).filter((p: any) => p.status === 'active').length;
      const pendingInvoices = (inv.data || []).filter((i: any) => i.status !== 'paid').length;
      
      setStats({
        invoices: (inv.data || []).length,
        payments: (pay.data || []).length,
        projects: (proj.data || []).length,
        files: (fil.data || []).length,
        notes: (not.data || []).length,
        outstanding,
        activeProjects,
        pendingInvoices
      } as any);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const tiles = [
    { label: 'Total Invoices',  value: stats.invoices,  icon: FileText,   color: '#4f46e5', bg: '#eef2ff', path: '/portal/invoices' },
    { label: 'Payments Made',   value: stats.payments,  icon: CreditCard, color: '#10b981', bg: '#ecfdf5', path: '/portal/payments' },
    { label: 'Active Projects', value: stats.activeProjects, icon: Briefcase, color: '#8b5cf6', bg: '#f5f3ff', path: '/portal/projects' },
    { label: 'Saved Files',     value: stats.files,     icon: FolderOpen, color: '#f43f5e', bg: '#fff1f2', path: '/portal/files' },
  ];

  return (
    <div className="animate-fade">
      {/* Premium Light Hero Banner */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--cp-radius-lg)', 
        padding: '40px', 
        marginBottom: '32px',
        border: '1px solid var(--cp-border)',
        position: 'relative', 
        overflow: 'hidden',
        boxShadow: 'var(--cp-shadow-lg)'
      }}>
        {/* Subtle background decorative elements */}
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, #eef2ff 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '10%', width: '250px', height: '250px', background: 'radial-gradient(circle, #f5f3ff 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ padding: '4px 10px', background: '#eef2ff', borderRadius: '100px', fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  System Overview
                </span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>Connected</span>
              </div>
              <h2 style={{ fontFamily: 'Outfit', color: 'var(--cp-text)', fontSize: 36, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                Good day, <span style={{ color: 'var(--cp-primary)' }}>{user?.name}</span>
              </h2>
              <p style={{ color: '#64748b', fontSize: 16, margin: 0, maxWidth: '500px' }}>
                Your client portal is up to date. You have {stats.activeProjects} active projects and {(stats as any).pendingInvoices || 0} invoices pending review.
              </p>
            </div>
            
            <div style={{ 
              background: '#f8fafc', 
              border: '1px solid var(--cp-border)',
              borderRadius: '24px',
              padding: '28px',
              textAlign: 'center',
              minWidth: '240px',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Outstanding</p>
              <h3 style={{ fontFamily: 'Outfit', fontSize: 32, fontWeight: 700, color: stats.outstanding > 0 ? '#ef4444' : '#10b981', margin: 0 }}>
                PKR {stats.outstanding.toLocaleString()}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                {stats.outstanding > 0 ? <AlertCircle size={14} color="#ef4444" /> : <CheckCircle2 size={14} color="#10b981" />}
                <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>{stats.outstanding > 0 ? 'Payment Required' : 'No Overdue Dues'}</span>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
            <button className="cp-btn cp-btn--primary" onClick={() => navigate('/portal/payments')}>
              Make a Payment <ArrowRight size={16} />
            </button>
            <button className="cp-btn cp-btn--ghost" onClick={() => navigate('/portal/projects')}>
              Track Projects
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="cp-stats">
        {tiles.map((tile, i) => (
          <div key={i} className="cp-stat animate-fade" style={{ animationDelay: `${i * 0.1}s`, cursor: 'pointer' }} onClick={() => navigate(tile.path)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="cp-stat__icon" style={{ background: tile.bg }}>
                <tile.icon size={22} color={tile.color} />
              </div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={14} color={tile.color} />
              </div>
            </div>
            <div>
              <div className="cp-stat__label">{tile.label}</div>
              <div className="cp-stat__value">{loading ? '...' : tile.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <div className="cp-card">
          <div className="cp-card__header">
            <span className="cp-card__title">Recent Highlights</span>
            <div className="cp-badge cp-badge--blue">Updates available</div>
          </div>
          <div className="cp-card__body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid var(--cp-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--cp-shadow)' }}>
                    <Clock size={18} color="var(--cp-primary)" />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Last Transaction</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: 'var(--cp-text)' }}>PKR 45,000</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Successfully processed</p>
              </div>
              
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid var(--cp-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--cp-shadow)' }}>
                    <TrendingUp size={18} color="#10b981" />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Global Progress</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: 'var(--cp-text)' }}>78% Avg</p>
                <div className="cp-progress" style={{ height: 6 }}>
                   <div className="cp-progress__bar" style={{ width: '78%' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '32px' }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: '16px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shortcuts</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { label: 'Write Note', icon: StickyNote, path: '/portal/notes' },
                  { label: 'Upload File', icon: FolderOpen, path: '/portal/files' },
                  { label: 'Project Status', icon: Briefcase, path: '/portal/projects' },
                ].map((act, i) => (
                  <button key={i} className="cp-btn cp-btn--ghost" onClick={() => navigate(act.path)}>
                    <act.icon size={16} color="var(--cp-primary)" /> {act.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="cp-card" style={{ background: 'linear-gradient(to bottom, #ffffff, #f1f5f9)' }}>
          <div className="cp-card__header">
            <span className="cp-card__title">Support Hub</span>
          </div>
          <div className="cp-card__body" style={{ textAlign: 'center' }}>
            <div style={{ 
              width: 64, height: 64, 
              background: 'white', 
              borderRadius: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: 'var(--cp-shadow-lg)'
            }}>
              <AlertCircle size={32} color="var(--cp-primary)" />
            </div>
            <h5 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Need Help?</h5>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
              Our dedicated support team is ready to assist you with any questions.
            </p>
            <button className="cp-btn cp-btn--primary" style={{ width: '100%' }}>
              Get Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
