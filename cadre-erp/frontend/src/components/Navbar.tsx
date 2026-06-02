import React, { useState, useEffect } from 'react';
import { Bell, User, LogOut } from 'lucide-react';
import { Menu, Popover, Transition } from '@headlessui/react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import api from '../utils/api';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  return (
    <header className="flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">System Overview</h1>
        <p className="text-xs font-semibold text-gray-400">Welcome back, {user?.name || 'User'}</p>
      </div>
      
      <div className="flex items-center space-x-5">
        <Popover className="relative">
          {({ open }) => (
            <>
              <Popover.Button className="relative p-2.5 text-gray-400 transition-all duration-200 rounded-xl hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 focus:outline-none">
                <span className="sr-only">View notifications</span>
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
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
                <Popover.Panel className="absolute right-0 w-80 p-2 mt-3 origin-top-right bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 focus:outline-none z-20">
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
                          className={clsx(
                            "p-3 rounded-xl transition-colors text-left border border-transparent cursor-pointer",
                            n.is_read ? 'hover:bg-gray-50' : 'bg-indigo-50/40 border-indigo-50/20 hover:bg-indigo-50/60'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={clsx("text-xs font-bold", n.is_read ? "text-gray-700" : "text-indigo-900")}>
                              {n.title}
                            </span>
                            <span className="text-[9px] font-semibold text-gray-400 whitespace-nowrap">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>


        <div className="h-8 w-px bg-gray-100"></div>

        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 focus:outline-none">
            {user?.profile_image ? (
              <img src={`http://localhost:5000/api/uploads/profiles/${user.profile_image}`} alt={user.name} className="w-10 h-10 rounded-xl object-cover shadow-md shadow-indigo-100" />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 text-white bg-indigo-600 rounded-xl shadow-md shadow-indigo-100 font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            <div className="hidden md:flex flex-col items-start pr-2">
              <span className="text-sm font-bold text-gray-900">{user?.name}</span>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{user?.role}</span>
            </div>
          </Menu.Button>
          <Transition
            as={React.Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95 translate-y-1"
            enterTo="transform opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="transform opacity-100 scale-100 translate-y-0"
            leaveTo="transform opacity-0 scale-95 translate-y-1"
          >
            <Menu.Items className="absolute right-0 w-56 p-2 mt-3 origin-top-right bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 focus:outline-none">
              <div className="px-3 py-2 mb-2 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Settings</p>
              </div>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => navigate('/settings')}
                    className={clsx(
                      "flex w-full items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors gap-3",
                      active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'
                    )}
                  >
                    <User className="w-4 h-4" />
                    Profile Settings
                  </button>
                )}
              </Menu.Item>
              <div className="my-1 border-t border-gray-50"></div>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={logout}
                    className={clsx(
                      "flex w-full items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors gap-3",
                      active ? 'bg-red-50 text-red-600' : 'text-red-500'
                    )}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  );
};

export default Navbar;
