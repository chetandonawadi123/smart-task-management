import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Bell, Check, RefreshCw, Trash2 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { notificationService } from '../services/notificationService';
import { getApiErrorMessage } from '../services/authService';
import { ProjectsShell } from '../components/projects/ProjectsShell';
import type { Notification } from '../services/notificationService';

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export const Notifications: React.FC = () => {
  const client = useQueryClient();
  const { markRead, markAllRead, remove, openNotification } = useNotifications();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notifications = useQuery({ queryKey: ['notifications', { unreadOnly }], queryFn: () => notificationService.list({ unread_only: unreadOnly, limit: 100, offset: 0 }) });
  const markAll = useMutation({ mutationFn: markAllRead, onSuccess: () => void client.invalidateQueries({ queryKey: ['notifications'] }) });
  const read = async (item: Notification) => { if (!item.is_read) await markRead(item.id); };
  const handleOpen = async (item: Notification) => { await read(item); openNotification(item); };
  return <ProjectsShell title="Notifications" subtitle="Stay up to date with activity in your organization.">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} className="rounded border-slate-300 text-blue-600" />Unread only</label><button type="button" disabled={markAll.isPending} onClick={() => void markAll.mutateAsync()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"><Check className="h-4 w-4" />Mark all as read</button></div>
    {notifications.isLoading ? <div className="space-y-3">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-white" />)}</div> : notifications.isError ? <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><AlertCircle className="mx-auto h-8 w-8 text-red-500" /><h2 className="mt-3 font-bold">Unable to load notifications</h2><p className="mt-1 text-sm text-slate-500">{getApiErrorMessage(notifications.error, 'Please try again.')}</p><button type="button" onClick={() => void notifications.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><RefreshCw className="h-4 w-4" />Try again</button></div> : notifications.data?.items.length ? <div className="space-y-3">{notifications.data.items.map((item) => <article key={item.id} className={`flex gap-4 rounded-2xl bg-white p-5 shadow-sm ${!item.is_read ? 'border-l-4 border-blue-600' : ''}`}><div className={`mt-1 rounded-xl p-3 ${item.is_read ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}><Bell className="h-5 w-5" /></div><button type="button" onClick={() => void handleOpen(item)} className="min-w-0 flex-1 text-left"><h2 className="text-sm font-bold text-slate-900">{item.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{formatDate(item.created_at)} · {item.notification_type}</p></button><div className="flex shrink-0 items-start gap-2">{!item.is_read && <button type="button" aria-label="Mark notification as read" onClick={() => void read(item)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Check className="h-4 w-4" /></button>}<button type="button" aria-label="Delete notification" onClick={() => void remove(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></article>)}</div> : <div className="rounded-2xl bg-white p-12 text-center shadow-sm"><Bell className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 font-bold text-slate-900">{unreadOnly ? 'No unread notifications' : 'No notifications yet'}</h2><p className="mt-1 text-sm text-slate-500">New activity will appear here.</p></div>}
  </ProjectsShell>;
};
