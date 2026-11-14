import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Menu, Search, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';
import { StatCard } from '../components/dashboard/StatCard';
import { TaskStatusChart, PriorityChart, ProjectChart, TeamChart } from '../components/dashboard/DashboardCharts';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const overview = useQuery({ queryKey: ['dashboard', 'overview'], queryFn: dashboardService.getOverview });
  const taskAnalytics = useQuery({ queryKey: ['dashboard', 'task-analytics'], queryFn: dashboardService.getTaskAnalytics });
  const projects = useQuery({ queryKey: ['dashboard', 'project-analytics'], queryFn: dashboardService.getProjectAnalytics });
  const team = useQuery({ queryKey: ['dashboard', 'team-analytics'], queryFn: dashboardService.getTeamAnalytics });
  const activity = useQuery({ queryKey: ['dashboard', 'recent-activity'], queryFn: dashboardService.getRecentActivity });
  const queries = [overview, taskAnalytics, projects, team, activity];
  const isLoading = queries.some((query) => query.isLoading);
  const hasError = queries.some((query) => query.isError);
  const retry = () => queries.forEach((query) => { if (query.isError) void query.refetch(); });

  return (
    <div className="flex min-h-screen bg-[#eef3f9]">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={logout} />
      <div className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-slate-200/80 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="text-slate-600 lg:hidden"><Menu className="h-6 w-6" /></button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search" placeholder="Search anything..." className="w-72 rounded-xl border-0 bg-slate-100 py-2.5 pl-10 pr-4 text-sm outline-none ring-blue-500 placeholder:text-slate-400 focus:ring-2" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 sm:hidden">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-3">
              <Link to="/profile" aria-label="Open profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{user?.name.charAt(0).toUpperCase()}</Link>
              <div className="hidden sm:block"><p className="text-sm font-semibold text-slate-800">{user?.name}</p><p className="text-xs text-slate-500">{user?.role}</p></div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </div>
          </div>
        </header>

        <main className="p-5 sm:p-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-medium text-blue-600">Overview</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Good morning, {user?.name.split(' ')[0]}</h1><p className="mt-2 text-sm text-slate-500">Here’s what’s happening with your work today.</p></div>
            <p className="text-xs font-medium text-slate-400">Organization analytics</p>
          </div>

          {isLoading ? <DashboardSkeleton /> : hasError ? (
            <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm"><AlertCircle className="mx-auto h-8 w-8 text-red-500" /><h2 className="mt-3 font-bold text-slate-900">Unable to load dashboard</h2><p className="mt-1 text-sm text-slate-500">Please check your connection and try again.</p><button type="button" onClick={retry} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><RefreshCw className="h-4 w-4" />Try again</button></div>
          ) : overview.data && taskAnalytics.data && projects.data && team.data && activity.data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total projects" value={overview.data.total_projects} detail="Across your organization" tone="blue" />
                <StatCard label="Total tasks" value={overview.data.total_tasks} detail={`${overview.data.in_progress_tasks} currently in progress`} tone="violet" />
                <StatCard label="Completed tasks" value={overview.data.completed_tasks} detail={`${overview.data.completion_percentage}% completion rate`} tone="green" />
                <StatCard label="Pending tasks" value={overview.data.pending_tasks} detail={`${overview.data.overdue_tasks} overdue tasks`} tone="amber" />
              </div>
              <div className="mt-6 grid gap-6 xl:grid-cols-2"><TaskStatusChart analytics={taskAnalytics.data} /><PriorityChart analytics={taskAnalytics.data} /><ProjectChart analytics={projects.data} /><TeamChart analytics={team.data} /><RecentActivity activity={activity.data} /></div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
};
