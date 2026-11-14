import React from 'react';
import { CalendarDays, UserRound } from 'lucide-react';
import type { Task } from '../../types';

const priorityClasses: Record<string, string> = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-50 text-blue-600', high: 'bg-amber-50 text-amber-700', critical: 'bg-red-50 text-red-600' };
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value)) : 'No due date';

export const TaskCard: React.FC<{ task: Task; onOpen: () => void; onDropStatus?: (status: Task['status']) => void }> = ({ task, onOpen, onDropStatus }) => (
  <button type="button" draggable={Boolean(onDropStatus)} onDragStart={(event) => event.dataTransfer.setData('taskId', String(task.id))} onClick={onOpen} className="w-full rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md">
    <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-bold text-slate-800">{task.title}</p><span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase ${priorityClasses[task.priority]}`}>{task.priority}</span></div>
    {task.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{task.description}</p>}
    <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(task.due_date)}</span><span className="inline-flex items-center gap-1">{task.assigned_to ? <><UserRound className="h-3.5 w-3.5" />User {task.assigned_to}</> : 'Unassigned'}</span></div>
  </button>
);
