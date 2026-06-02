import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { 
  FolderOpen, File, FileText, Image as ImageIcon, 
  Film, Download, Trash2, Upload, Search, Filter 
} from 'lucide-react';

interface ClientFile {
  id: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

const ClientFiles: React.FC = () => {
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => { api.get('/portal/files').then(r => setFiles(r.data)).catch(console.error).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    const tid = toast.loading('Uploading file...');
    try {
      await api.post('/portal/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('File uploaded successfully', { id: tid });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed', { id: tid });
    }
  };

  const download = async (id: string, name: string) => {
    try {
      const response = await api.get(`/portal/files/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { toast.error('Download failed'); }
  };

  const deleteFile = async (id: string) => {
    if (!confirm('Permanently delete this file?')) return;
    try { await api.delete(`/portal/files/${id}`); toast.success('File deleted'); load(); }
    catch { toast.error('Error deleting file'); }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon size={32} color="#10b981" />;
    if (type.includes('pdf')) return <FileText size={32} color="#ef4444" />;
    if (type.includes('video')) return <Film size={32} color="#8b5cf6" />;
    return <File size={32} color="#64748b" />;
  };

  const filtered = files.filter(f => f.original_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 700, color: 'var(--cp-text)' }}>Documents & Files</h1>
          <p style={{ margin: 0, color: 'var(--cp-text-muted)', fontSize: 14 }}>Securely store and access your project-related documents</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <label className="cp-btn cp-btn--primary" style={{ cursor: 'pointer' }}>
             <Upload size={16} /> Upload New File
             <input type="file" style={{ display: 'none' }} onChange={handleUpload} />
          </label>
        </div>
      </div>

      {/* File Controls */}
      <div className="cp-card" style={{ marginBottom: 24 }}>
        <div style={{ padding: '16px 24px', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              className="cp-input" 
              placeholder="Search files by name..." 
              style={{ paddingLeft: 40, background: '#f8fafc' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="cp-btn cp-btn--ghost"><Filter size={16} /> Filters</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading your secure storage...</div>
      ) : filtered.length === 0 ? (
        <div className="cp-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
           <FolderOpen size={48} color="var(--cp-border)" style={{ marginBottom: 16 }} />
           <h3 style={{ margin: '0 0 8px' }}>No files found</h3>
           <p style={{ color: 'var(--cp-text-muted)', marginBottom: 0 }}>Try adjusting your search or upload a new document.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
          {filtered.map(f => (
            <div key={f.id} className="cp-card animate-fade" style={{ padding: '24px', textAlign: 'center', position: 'relative', transition: '0.2s' }}>
              <div style={{ 
                width: 64, height: 64, 
                background: '#f8fafc', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '1px solid var(--cp-border)'
              }}>
                {getFileIcon(f.file_type)}
              </div>
              
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cp-text)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.original_name}>
                {f.original_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--cp-text-muted)', marginBottom: 20 }}>
                {(f.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(f.created_at).toLocaleDateString()}
              </div>
              
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="cp-btn cp-btn--ghost" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => download(f.id, f.original_name)}>
                  <Download size={14} />
                </button>
                <button className="cp-btn" style={{ padding: '8px 12px', fontSize: 12, background: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={() => deleteFile(f.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientFiles;
