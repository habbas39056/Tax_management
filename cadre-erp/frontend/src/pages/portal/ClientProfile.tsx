import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Shield, ShieldCheck, Key, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

const ClientProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="animate-fade">
      <div className="cp-page-header">
        <h1>My Profile</h1>
        <p>Manage your account settings and security preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
        {/* Profile Card */}
        <div className="cp-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ 
            width: 100, height: 100, 
            borderRadius: '50%', 
            background: 'var(--cp-primary)', 
            color: 'white', 
            fontSize: 36, 
            fontWeight: 700,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 10px 20px rgba(79, 70, 229, 0.2)'
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700 }}>{user?.name}</h2>
          <p style={{ color: 'var(--cp-text-muted)', margin: '0 0 24px' }}>{user?.email}</p>
          
          <div className="cp-badge cp-badge--blue" style={{ marginBottom: 32 }}>
            <ShieldCheck size={14} style={{ marginRight: 6 }} /> Verified Account
          </div>

          <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: 24 }}>
             <button className="cp-btn" onClick={handleLogout} style={{ width: '100%', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca' }}>
               <LogOut size={16} /> Sign Out
             </button>
          </div>
        </div>

        {/* Account Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="cp-card">
            <div className="cp-card__header">
              <span className="cp-card__title">Personal Information</span>
              <button className="cp-btn cp-btn--ghost cp-btn--sm" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
            <div className="cp-card__body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="cp-form-group" style={{ padding: 0 }}>
                  <label>Full Name</label>
                  <input className="cp-input" value={user?.name} readOnly={!isEditing} />
                </div>
                <div className="cp-form-group" style={{ padding: 0 }}>
                  <label>Email Address</label>
                  <input className="cp-input" value={user?.email} readOnly={!isEditing} />
                </div>
                <div className="cp-form-group" style={{ padding: 0 }}>
                  <label>Portal ID</label>
                  <input className="cp-input" value={`#${user?.id?.substring(0,8).toUpperCase()}`} readOnly />
                </div>
                <div className="cp-form-group" style={{ padding: 0 }}>
                  <label>Role</label>
                  <input className="cp-input" value="Verified Client" readOnly />
                </div>
              </div>
              {isEditing && (
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="cp-btn cp-btn--primary" onClick={() => { toast.success('Profile updated'); setIsEditing(false); }}>
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="cp-card">
            <div className="cp-card__header">
              <span className="cp-card__title">Security</span>
            </div>
            <div className="cp-card__body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8fafc', border: '1px solid var(--cp-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Key size={20} color="var(--cp-primary)" />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: 600 }}>Account Password</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--cp-text-muted)' }}>Last changed 3 months ago</p>
                  </div>
                </div>
                <button className="cp-btn cp-btn--ghost">Update Password</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;
