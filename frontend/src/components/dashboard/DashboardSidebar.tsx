import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  CheckSquare,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Settings,
  X,
} from 'lucide-react';

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Projects', icon: FolderKanban, to: '/projects' },
  { label: 'Tasks', icon: ListTodo },
  { label: 'Kanban Board', icon: KanbanSquare },
  { label: 'Notifications', icon: Bell },
  { label: 'Settings', icon: Settings },
];

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ open, onClose, onLogout }) => (
  <>
    {open && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#0b1329] px-4 py-6 text-slate-300 transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2 text-white">
            <CheckSquare className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">SmartTask</span>
        </div>
        <button aria-label="Close navigation" onClick={onClose} className="text-slate-400 lg:hidden">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="mt-10 flex-1 space-y-1">
        <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
        {navigation.map(({ label, icon: Icon, to }) => (
          to ? <NavLink key={label} to={to} onClick={onClose} className={({ isActive }) => `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Icon className="h-5 w-5" />
            {label}
          </NavLink> : <button key={label} type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">
            <Icon className="h-5 w-5" />{label}
          </button>
        ))}
      </nav>

      <button type="button" onClick={onLogout} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
        <LogOut className="h-5 w-5" />
        Logout
      </button>
    </aside>
  </>
);
