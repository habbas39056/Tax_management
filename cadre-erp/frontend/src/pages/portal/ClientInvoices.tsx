import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { FileText, DollarSign, Clock, CheckCircle2, Download, Filter } from 'lucide-react';

interface Invoice {
  id: string;
  total_amount: number;
  service_charges_total: number;
  other_charges_total: number;
  status: 'unpaid' | 'partial' | 'paid';
  created_at: string;
  due_date?: string;
  amount_paid: number;
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = { paid: 'cp-badge--green', partial: 'cp-badge--yellow', unpaid: 'cp-badge--red' };
  return <span className={`cp-badge ${map[s] ?? 'cp-badge--gray'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>;
};

const fmt = (n: number) => `PKR ${Number(n).toLocaleString()}`;

const ClientInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleExport = () => {
    if (invoices.length === 0) return;
    const headers = ['Invoice ID', 'Date', 'Due Date', 'Service Fees', 'Govt/Other', 'Total Amount', 'Paid', 'Balance', 'Status'];
    const rows = invoices.map(inv => [
      inv.id.substring(0, 8).toUpperCase(),
      new Date(inv.created_at).toLocaleDateString(),
      inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A',
      inv.service_charges_total,
      inv.other_charges_total,
      inv.total_amount,
      inv.amount_paid,
      Number(inv.total_amount) - Number(inv.amount_paid),
      inv.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Statement_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  useEffect(() => {
    api.get('/portal/invoices').then(r => setInvoices(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totals = (invoices || []).reduce((acc, i) => ({
    total: acc.total + Number(i.total_amount),
    paid: acc.paid + Number(i.amount_paid),
    unpaid: acc.unpaid + (i.status === 'unpaid' ? Number(i.total_amount) : 0),
  }), { total: 0, paid: 0, unpaid: 0 });

  return (
    <div className="animate-fade">
      <div className="cp-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Financial Invoices</h1>
            <p>Access and manage all billing records associated with your account</p>
          </div>
          <button onClick={handleExport} className="cp-btn cp-btn--ghost">
            <Download size={16} /> Export Statement
          </button>
        </div>
      </div>

      <div className="cp-stats">
        {[
          { label: 'Total Invoices', value: invoices.length, icon: FileText, color: '#818cf8', bg: 'rgba(129, 140, 248, 0.1)' },
          { label: 'Amount Paid', value: fmt(totals.paid), icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
          { label: 'Outstanding', value: fmt(totals.total - totals.paid), icon: Clock, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
          { label: 'Total Billed', value: fmt(totals.total), icon: DollarSign, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        ].map((s, i) => (
          <div key={i} className="cp-stat">
            <div className="cp-stat__icon" style={{ background: s.bg }}><s.icon size={20} color={s.color} /></div>
            <div className="cp-stat__label">{s.label}</div>
            <div className="cp-stat__value" style={{ color: s.color === '#818cf8' ? 'var(--cp-text)' : s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="cp-card">
        <div className="cp-card__header">
          <span className="cp-card__title">Billing History</span>
          <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
            {filterOpen && (
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--cp-border)', background: 'var(--cp-bg)' }}
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>
            )}
            <button onClick={() => setFilterOpen(!filterOpen)} className={`cp-btn cp-btn--sm ${filterOpen ? 'cp-btn--primary' : 'cp-btn--ghost'}`}>
              <Filter size={14} /> Filter
            </button>
          </div>
        </div>
        <div className="cp-table-wrap">
          {loading ? (
             <div style={{ padding: '60px', textAlign: 'center' }}>
               <div className="animate-pulse" style={{ color: 'var(--cp-text-muted)' }}>Fetching your financial records...</div>
             </div>
          ) : (
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Service Fees</th>
                  <th>Govt. / Other</th>
                  <th>Total Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.filter(inv => statusFilter === 'all' || inv.status === statusFilter).length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>No invoices match your criteria.</td></tr>
                ) : invoices.filter(inv => statusFilter === 'all' || inv.status === statusFilter).map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--cp-accent)', background: 'rgba(129,140,248,0.05)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                        #{inv.id.substring(0, 8).toUpperCase()}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(inv.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--cp-danger)' }}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </td>
                    <td>{fmt(inv.service_charges_total)}</td>
                    <td>{fmt(inv.other_charges_total)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(inv.total_amount)}</td>
                    <td style={{ color: 'var(--cp-success)', fontWeight: 600 }}>{fmt(inv.amount_paid)}</td>
                    <td style={{ color: (Number(inv.total_amount) - Number(inv.amount_paid)) > 0 ? 'var(--cp-danger)' : 'var(--cp-text-muted)', fontWeight: 700 }}>
                      {fmt(Number(inv.total_amount) - Number(inv.amount_paid))}
                    </td>
                    <td>{statusBadge(inv.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientInvoices;
