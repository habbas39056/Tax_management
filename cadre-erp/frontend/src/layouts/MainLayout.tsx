import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

import { useAuth } from '../context/AuthContext';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'Client';

  return (
    <div className="flex h-screen overflow-hidden bg-[#fcfdfe]">
      <Sidebar role={role} />
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <Navbar />
        <main className="relative flex-1 overflow-y-auto focus:outline-none scroll-smooth">
          <div className="py-10 mx-auto max-w-7xl px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
