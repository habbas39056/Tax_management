import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, DollarSign, Calendar, FileText, Plus, CheckCircle2, Search } from 'lucide-react';

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  payment_date: string;
  notes: string;
}

interface Invoice {
  id: string;
  total_amount: number;
  amount_paid: number;
  status: string;
}

const ClientPayments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ invoice_id: '', amount: '', payment_method: 'bank_transfer', reference_number: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/portal/payments'), api.get('/portal/invoices')])
      .then(([p, i]) => { setPayments(p.data); setInvoices(i.data.filter((inv: any) => inv.status !== 'paid')); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/portal/payments', form);
      toast.success('Payment recorded successfully');
      setShowForm(false);
      setForm({ invoice_id: '', amount: '', payment_method: 'bank_transfer', reference_number: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
      load();
    } catch { toast.error('Error recording payment'); }
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 700, color: 'var(--cp-text)' }}>Payment History</h1>
          <p style={{ margin: 0, color: 'var(--cp-text-muted)', fontSize: 14 }}>Track your transactions and view payments against invoices</p>
        </div>
      </div>

      <div className="cp-stats">
        <div className="cp-stat">
          <div className="cp-stat__icon" style={{ background: '#ecfdf5' }}><CheckCircle2 size={20} color="#10b981" /></div>
          <div className="cp-stat__label">Transactions</div>
          <div className="cp-stat__value">{payments.length}</div>
        </div>
        <div className="cp-stat">
          <div className="cp-stat__icon" style={{ background: '#eef2ff' }}><DollarSign size={20} color="#4f46e5" /></div>
          <div className="cp-stat__label">Total Transacted</div>
          <div className="cp-stat__value">PKR {payments.reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="cp-card">
        <div className="cp-card__header"><span className="cp-card__title">Recent Transactions</span></div>
        <div className="cp-table-wrap">
          {loading ? (
             <div style={{ padding: '60px', textAlign: 'center' }}>Loading your financial ledger...</div>
          ) : (
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>No payments found in your history.</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>#{p.invoice_id.substring(0, 8).toUpperCase()}</td>
                    <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.payment_method.replace('_', ' ')}</td>
                    <td style={{ color: 'var(--cp-text-muted)' }}>{p.reference_number || '---'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--cp-success)' }}>PKR {Number(p.amount).toLocaleString()}</td>
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

export default ClientPayments;
