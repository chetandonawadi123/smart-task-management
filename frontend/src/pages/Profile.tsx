import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CalendarDays, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { authService, getApiErrorMessage } from '../services/authService';
import { ProjectsShell } from '../components/projects/ProjectsShell';
import { useAuth } from '../contexts/AuthContext';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(value));

export const Profile: React.FC = () => {
  const { user: authUser } = useAuth();
  const profile = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getCurrentUser,
    initialData: authUser ?? undefined,
    enabled: Boolean(authUser),
  });
  const user = profile.data;

  return (
    <ProjectsShell title="Your profile" subtitle="Review the account information provided by your organization.">
      {profile.isError ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <h2 className="mt-3 font-bold text-slate-900">Unable to load your profile</h2>
          <p className="mt-1 text-sm text-slate-500">{getApiErrorMessage(profile.error, 'Please try again.')}</p>
        </div>
      ) : user ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 border-b border-slate-100 pb-7 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-3xl font-bold text-blue-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Account profile</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">{user.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-400"><Mail className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Email</span></div>
                <p className="mt-2 text-sm font-semibold text-slate-800">{user.email}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-400"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Role</span></div>
                <p className="mt-2 text-sm font-semibold capitalize text-slate-800">{user.role}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-400"><UserRound className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Account ID</span></div>
                <p className="mt-2 text-sm font-semibold text-slate-800">{user.id}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-400"><CalendarDays className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Created</span></div>
                <p className="mt-2 text-sm font-semibold text-slate-800">{formatDate(user.created_at)}</p>
              </div>
            </div>
          </section>
          <aside className="rounded-2xl bg-[#0b1329] p-6 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">Organization access</p>
            <h2 className="mt-3 text-xl font-bold">Organization #{user.organization_id}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Your projects, tasks, analytics, and notifications are scoped by this organization on the backend.</p>
            <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm text-slate-300"><span className="font-semibold text-white">Status:</span> {user.is_active ? 'Active account' : 'Inactive account'}</div>
          </aside>
        </div>
      ) : null}
    </ProjectsShell>
  );
};
