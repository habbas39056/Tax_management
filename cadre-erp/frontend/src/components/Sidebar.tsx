import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileText, 
  DollarSign, 
  Settings, 
  Bot,
  Shield,
  Layers,
  LogOut,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  role: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { user, logout } = useAuth();
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    'AI Agents': false
  });

  const toggleSubMenu = (name: string) => {
    setOpenSubMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const getNavItems = () => {
    const items = [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'] },
      { name: 'Clients', path: '/clients', icon: Users, roles: ['Super Admin', 'Sales', 'CSR'] },
      { name: 'Projects', path: '/projects', icon: Briefcase, roles: ['Super Admin', 'Sales', 'Operations'] },
      { name: 'Invoices', path: '/invoices', icon: FileText, roles: ['Super Admin', 'Accounts', 'Sales'] },
      { name: 'Reports', path: '/reports', icon: Layers, roles: ['Super Admin', 'Accounts'] },
      { 
        name: 'AI Agents', 
        icon: Bot, 
        roles: ['Super Admin', 'Operations'],
        subItems: [
          { name: 'AI Report', path: '/ai-agents/report' },
          { name: 'Knowledge Base', path: '/ai-agents/knowledge-base' },
          { name: 'Leads', path: '/ai-agents/leads' },
          { name: 'AI Config', path: '/ai-agents/config' }
        ]
      },
      { name: 'Staff Management', path: '/staff', icon: Shield, roles: ['Super Admin'] },
      { name: 'Settings', path: '/settings', icon: Settings, roles: ['Super Admin'] },
    ];

    return items.filter(item => item.roles.includes(role));
  };

  const navItems = getNavItems();

  return (
    <div className="flex flex-col w-72 bg-white h-full border-r border-gray-100 shadow-sm transition-all duration-300">
      <div className="flex items-center justify-center py-12 border-b border-gray-50 px-8">
        <img src="/logo.png" alt="Logo" className="w-48 h-auto object-contain" />
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto mt-8">
        <nav className="flex-1 px-4 space-y-1">
          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[2px] mb-4">Main Menu</p>
          </div>
          {navItems.map((item) => (
            <div key={item.name}>
              {item.subItems ? (
                <>
                  <button
                    onClick={() => toggleSubMenu(item.name)}
                    className={clsx(
                      'w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group',
                      openSubMenus[item.name] ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx("p-2 rounded-lg transition-colors", "group-hover:bg-white")}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      {item.name}
                    </div>
                    {openSubMenus[item.name] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {openSubMenus[item.name] && (
                    <div className="ml-12 mt-1 space-y-1">
                      {item.subItems.map(subItem => (
                        <NavLink
                          key={subItem.name}
                          to={subItem.path}
                          className={({ isActive }) =>
                            clsx(
                              'block px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                              isActive
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            )
                          }
                        >
                          {subItem.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.path!}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 gap-3 group',
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    )
                  }
                >
                  <div className={clsx(
                    "p-2 rounded-lg transition-colors",
                    "group-hover:bg-white"
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  {item.name}
                </NavLink>
              )}
            </div>
          ))}
        </nav>
      </div>
      
      <div className="p-6 border-t border-gray-50 space-y-3">
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
          {user?.profile_image ? (
            <img src={`http://localhost:5000/api/uploads/profiles/${user.profile_image}`} alt={user.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Administrator'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role || 'Manage System'}</p>
          </div>
        </div>

        <button 
          onClick={logout}
          className="flex w-full items-center px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all gap-3"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
