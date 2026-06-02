import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, StickyNote, Calendar, Palette, X } from 'lucide-react';

interface Note { id: string; title: string; content: string; color: string; updated_at: string; }

const NOTE_COLORS = [
  { bg: '#fef9c3', border: '#fde047', label: 'Yellow' },
  { bg: '#dcfce7', border: '#86efac', label: 'Green' },
  { bg: '#dbeafe', border: '#93c5fd', label: 'Blue' },
  { bg: '#fce7f3', border: '#f9a8d4', label: 'Pink' },
  { bg: '#ede9fe', border: '#c4b5fd', label: 'Purple' },
  { bg: '#ffedd5', border: '#fdba74', label: 'Orange' },
  { bg: '#f8fafc', border: '#cbd5e1', label: 'Slate' }
];

const ClientNotes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | Note>(null);
  const [form, setForm] = useState({ title: '', content: '', color: NOTE_COLORS[0].bg });

  const load = () => { api.get('/portal/notes').then(r => setNotes(r.data)).catch(console.error).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openCreate = () => { setForm({ title: '', content: '', color: NOTE_COLORS[0].bg }); setModal('create'); };
  const openEdit = (n: Note) => { setForm({ title: n.title, content: n.content, color: n.color }); setModal(n); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modal === 'create') {
        await api.post('/portal/notes', form);
        toast.success('Note saved');
      } else {
        await api.put(`/portal/notes/${(modal as Note).id}`, form);
        toast.success('Note updated');
      }
      setModal(null);
      load();
    } catch { toast.error('Error saving note'); }
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this note permanently?')) return;
    try { await api.delete(`/portal/notes/${id}`); toast.success('Note deleted'); load(); }
    catch { toast.error('Error deleting note'); }
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 700, color: 'var(--cp-text)' }}>Personal Notes</h1>
          <p style={{ margin: 0, color: 'var(--cp-text-muted)', fontSize: 14 }}>Your private memos and reminders</p>
        </div>
        <button className="cp-btn cp-btn--primary" onClick={openCreate}><Plus size={16} /> Add New Note</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="cp-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
           <StickyNote size={48} color="var(--cp-border)" style={{ marginBottom: 16 }} />
           <h3 style={{ margin: '0 0 8px' }}>Your note wall is empty</h3>
           <p style={{ color: 'var(--cp-text-muted)', marginBottom: 24 }}>Start by creating your first personal note.</p>
           <button className="cp-btn cp-btn--primary" onClick={openCreate}><Plus size={16} /> Create Note</button>
        </div>
      ) : (
        <div className="cp-notes-grid">
          {notes.map((n) => (
            <div key={n.id} className="cp-note-card animate-fade" style={{ background: n.color || '#fef9c3' }}>
              <div className="cp-note-card__title">{n.title}</div>
              <div className="cp-note-card__body">{n.content}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} /> {new Date(n.updated_at).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(n)} style={{ background: 'white', border: 'none', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <Pencil size={12} color="#475569" />
                  </button>
                  <button onClick={() => deleteNote(n.id)} style={{ background: 'white', border: 'none', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <Trash2 size={12} color="#ef4444" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="cp-modal-overlay" onClick={() => setModal(null)}>
          <div className="cp-modal animate-fade" onClick={e => e.stopPropagation()}>
            <div className="cp-modal__title">
              <div style={{ width: 32, height: 32, background: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cp-border)' }}>
                <StickyNote size={18} color="var(--cp-primary)" />
              </div>
              {modal === 'create' ? 'Create New Note' : 'Edit Note'}
              <button onClick={() => setModal(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={submit}>
              <div className="cp-form-group">
                <label>Note Title</label>
                <input 
                  className="cp-input" 
                  required 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  placeholder="Short descriptive title..." 
                />
              </div>
              
              <div className="cp-form-group">
                <label>Content Details</label>
                <textarea 
                  className="cp-textarea" 
                  rows={6}
                  value={form.content} 
                  onChange={e => setForm({ ...form, content: e.target.value })} 
                  placeholder="Write your details here..." 
                />
              </div>
              
              <div className="cp-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Palette size={14} /> Background Color
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  {NOTE_COLORS.map(c => (
                    <div 
                      key={c.bg} 
                      onClick={() => setForm({ ...form, color: c.bg })}
                      style={{ 
                        width: 32, height: 32, 
                        background: c.bg, 
                        borderRadius: 8, 
                        cursor: 'pointer', 
                        border: form.color === c.bg ? '3px solid var(--cp-primary)' : `1px solid ${c.border}`,
                        transition: '0.2s'
                      }} 
                    />
                  ))}
                </div>
              </div>
              
              <div className="cp-modal__footer">
                <button type="button" className="cp-btn cp-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="cp-btn cp-btn--primary">
                  {modal === 'create' ? 'Save Note' : 'Update Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientNotes;
