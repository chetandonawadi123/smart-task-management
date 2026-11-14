import React, { useState } from 'react';
import { Menu, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardSidebar } from '../dashboard/DashboardSidebar';
import { NotificationBell } from '../notifications/NotificationBell';
import { Link } from 'react-router-dom';

export const ProjectsShell: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({ children, title, subtitle }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#eef3f9]">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={logout} />
      <div className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-slate-200/80 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="text-slate-600 lg:hidden"><Menu className="h-6 w-6" /></button>
            <div className="relative hidden sm:block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search" placeholder="Search anything..." className="w-72 rounded-xl border-0 bg-slate-100 py-2.5 pl-10 pr-4 text-sm outline-none ring-blue-500 placeholder:text-slate-400 focus:ring-2" /></div>
            <h1 className="text-lg font-bold text-slate-900 sm:hidden">{title}</h1>
          </div>
          <div className="flex items-center gap-4"><NotificationBell /><div className="hidden h-8 w-px bg-slate-200 sm:block" /><div className="flex items-center gap-3"><Link to="/profile" aria-label="Open profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{user?.name.charAt(0).toUpperCase()}</Link><div className="hidden sm:block"><p className="text-sm font-semibold text-slate-800">{user?.name}</p><p className="text-xs text-slate-500">{user?.role}</p></div><ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" /></div></div>
        </header>
        <main className="p-5 sm:p-8"><div className="mb-7"><p className="text-sm font-medium text-blue-600">Workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-slate-500">{subtitle}</p></div>{children}</main>
      </div>
    </div>
  );
};
