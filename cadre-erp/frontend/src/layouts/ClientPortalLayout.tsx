import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Popover, Transition } from '@headlessui/react';
import { useAuth } from '../context/AuthContext';
import '../portal.css';
import {
  LayoutDashboard, FileText, CreditCard, StickyNote, Briefcase, FolderOpen,
  LogOut, Menu, X, User, Bell, ChevronRight, Settings, HelpCircle
} from 'lucide-react';

const ClientPortalLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [notifications, setNotifications] = useState<any[]>([]);

  React.useEffect(() => {
    // Fetch notifications
    import('../utils/api').then(({ default: api }) => {
      api.get('/notifications')
        .then(res => setNotifications(res.data))
        .catch(console.error);
    });
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = () => {
    import('../utils/api').then(({ default: api }) => {
      api.put('/notifications/read-all').then(() => {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      });
    });
  };

  const markAsRead = (id: string) => {
    import('../utils/api').then(({ default: api }) => {
      api.put(`/notifications/${id}/read`).then(() => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      });
    });
  };


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/portal',      icon: LayoutDashboard, color: 'from-indigo-500 to-blue-500' },
    { name: 'Invoices',  path: '/portal/invoices',  icon: FileText,        color: 'from-blue-500 to-cyan-500' },
    { name: 'Payments',  path: '/portal/payments',  icon: CreditCard,      color: 'from-emerald-500 to-teal-500' },
    { name: 'Notes',     path: '/portal/notes',     icon: StickyNote,      color: 'from-amber-500 to-orange-500' },
    { name: 'Projects',  path: '/portal/projects',  icon: Briefcase,       color: 'from-violet-500 to-purple-500' },
    { name: 'My Files',  path: '/portal/files',     icon: FolderOpen,      color: 'from-rose-500 to-pink-500' },
  ];

  const getPageTitle = () => {
    const item = navItems.find(i => location.pathname === i.path || (i.path !== '/portal' && location.pathname.startsWith(i.path)));
    return item ? item.name : 'Client Portal';
  };

  return (
    <div className="cp-root">
      {/* Sidebar */}
      <aside className={`cp-sidebar ${sidebarOpen ? 'cp-sidebar--open' : 'cp-sidebar--closed'}`}>
        <div className="cp-sidebar__header">
          <div className="cp-sidebar__brand" style={{ padding: '20px 0' }}>
            <img src="/logo.png" alt="Logo" style={{ width: 200, height: 'auto', objectFit: 'contain' }} />
          </div>
        </div>

        {/* User profile section removed from sidebar */}

        <nav className="cp-nav">
          <p style={{ 
            fontSize: 11, 
            fontWeight: 700, 
            color: 'var(--cp-text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '1px',
            margin: '0 0 10px 14px',
            display: sidebarOpen ? 'block' : 'none'
          }}>Menu</p>
          
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/portal'}
              className={({ isActive }) =>
                `cp-nav__item ${isActive ? 'cp-nav__item--active' : ''}`
              }
              title={!sidebarOpen ? item.name : undefined}
            >
              <div className={`cp-nav__icon bg-gradient-to-br ${item.color}`}>
                <item.icon size={18} color="white" strokeWidth={2.5} />
              </div>
              {sidebarOpen && (
                <>
                  <span className="cp-nav__label">{item.name}</span>
                  <ChevronRight size={14} className="cp-nav__chevron" />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="cp-sidebar__footer" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sidebarOpen && (
              <>
                <button className="cp-nav__item" style={{ background: 'transparent' }} onClick={() => navigate('/portal/settings')}>
                  <div className="cp-nav__icon" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <Settings size={18} />
                  </div>
                  <span className="cp-nav__label">Account Settings</span>
                </button>
                <button className="cp-nav__item" style={{ background: 'transparent' }}>
                  <div className="cp-nav__icon" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <HelpCircle size={18} />
                  </div>
                  <span className="cp-nav__label">Help Support</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="cp-main">
        {/* Top bar */}
        <header className="cp-topbar">
          <div className="cp-topbar__left">
            <h2 className="cp-topbar__title">{getPageTitle()}</h2>
          </div>
          <div className="cp-topbar__right">
            <Popover className="relative">
              {({ open }) => (
                <>
                  <Popover.Button className="cp-topbar__icon-btn relative focus:outline-none" title="Notifications">
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="cp-topbar__badge">{unreadCount}</span>
                    )}
                  </Popover.Button>

                  <Transition
                    as={React.Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95 translate-y-1"
                    enterTo="transform opacity-100 scale-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                    leaveTo="transform opacity-0 scale-95 translate-y-1"
                  >
                    <Popover.Panel className="absolute right-0 w-80 p-2 mt-3 origin-top-right bg-white rounded-2xl shadow-xl border border-gray-100 focus:outline-none z-20" style={{ color: 'initial' }}>
                      <div className="flex items-center justify-between px-3 py-2 mb-2 border-b border-gray-50">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notifications</p>
                        {unreadCount > 0 && (
                          <button onClick={markAllAsRead} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 focus:outline-none">
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-6">No notifications</p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                              className={`p-3 rounded-xl transition-colors text-left border border-transparent cursor-pointer ${
                                n.is_read ? 'hover:bg-gray-50' : 'bg-indigo-50/40 border-indigo-50/20 hover:bg-indigo-50/60'
                              }`}
                              style={{ display: 'block' }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className={`text-xs font-bold ${n.is_read ? 'text-gray-700' : 'text-indigo-900'}`}>
                                  {n.title}
                                </span>
                                <span className="text-[9px] font-semibold text-gray-400 whitespace-nowrap">
                                  {new Date(n.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5" style={{ margin: '4px 0 0 0' }}>{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </Popover.Panel>
                  </Transition>
                </>
              )}
            </Popover>
            <div className="cp-topbar__user" onClick={() => navigate('/portal/settings')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user?.profile_image ? (
                <img src={`http://localhost:5000/api/uploads/profiles/${user.profile_image}`} alt={user.name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <User size={16} />
              )}
              <span>{user?.name}</span>
            </div>
            <button className="cp-btn" onClick={handleLogout} style={{ 
              background: '#fee2e2', 
              color: '#ef4444', 
              border: '1px solid #fecaca',
              padding: '8px 12px'
            }}>
              <LogOut size={16} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Logout</span>
            </button>
          </div>
        </header>

        <main className="cp-content animate-fade">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ClientPortalLayout;
