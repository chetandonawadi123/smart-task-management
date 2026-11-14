import React, { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Task, TaskPriority, TaskStatus } from '../../types';
import type { Project } from '../../services/projectService';

const schema = z.object({
  projectId: z.coerce.number().int().positive('Select a project'),
  title: z.string().trim().min(1, 'Task title is required').max(200),
  description: z.string().max(5000),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']),
  due_date: z.string(),
  assigned_to: z.string().refine((value) => !value || (/^\d+$/.test(value) && Number(value) > 0), 'Enter a valid user ID'),
});

export type TaskFormValues = z.infer<typeof schema>;

interface Props {
  projects: Project[];
  task?: Task;
  defaultProjectId?: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: { projectId: number; title: string; description: string | null; priority: TaskPriority; status?: TaskStatus; due_date: string | null; assigned_to?: number | null }) => Promise<void>;
}

export const TaskFormModal: React.FC<Props> = ({ projects, task, defaultProjectId, isSubmitting, onClose, onSubmit }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: task?.project_id ?? defaultProjectId ?? projects[0]?.id,
      title: task?.title ?? '',
      description: task?.description ?? '',
      priority: task?.priority ?? 'medium',
      status: task?.status ?? 'todo',
      due_date: task?.due_date ? task.due_date.slice(0, 10) : '',
      assigned_to: task?.assigned_to ? String(task.assigned_to) : '',
    },
  });
  useEffect(() => {
    reset({ projectId: task?.project_id ?? defaultProjectId ?? projects[0]?.id, title: task?.title ?? '', description: task?.description ?? '', priority: task?.priority ?? 'medium', status: task?.status ?? 'todo', due_date: task?.due_date ? task.due_date.slice(0, 10) : '', assigned_to: task?.assigned_to ? String(task.assigned_to) : '' });
  }, [defaultProjectId, projects, reset, task]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true">
    <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-slate-900">{task ? 'Edit task' : 'Create task'}</h2><p className="mt-1 text-sm text-slate-500">{task ? 'Update task details.' : 'Add work to a project.'}</p></div><button type="button" onClick={onClose} aria-label="Close dialog"><X className="h-5 w-5 text-slate-400" /></button></div>
      <form onSubmit={handleSubmit(async (data) => onSubmit({ projectId: data.projectId, title: data.title.trim(), description: data.description.trim() || null, priority: data.priority as TaskPriority, status: task ? undefined : data.status as TaskStatus, due_date: data.due_date ? new Date(`${data.due_date}T00:00:00Z`).toISOString() : null, assigned_to: data.assigned_to ? Number(data.assigned_to) : null }))} className="mt-6 space-y-4">
        {!task && <div><label className="text-sm font-semibold text-slate-700">Project</label><select {...register('projectId')} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{errors.projectId && <p className="text-xs text-red-600">{errors.projectId.message}</p>}</div>}
        <div><label className="text-sm font-semibold text-slate-700">Title</label><input {...register('title')} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />{errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}</div>
        <div><label className="text-sm font-semibold text-slate-700">Description</label><textarea rows={3} {...register('description')} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="text-sm font-semibold text-slate-700">Priority</label><select {...register('priority')} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div><div><label className="text-sm font-semibold text-slate-700">Due date</label><input type="date" {...register('due_date')} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></div></div>
        {!task && <div><label className="text-sm font-semibold text-slate-700">Status</label><select {...register('status')} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="in_review">In Review</option><option value="done">Done</option></select></div>}
        <div><label className="text-sm font-semibold text-slate-700">Assignee user ID <span className="font-normal text-slate-400">(optional)</span></label><input inputMode="numeric" {...register('assigned_to')} placeholder="Backend user ID" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />{errors.assigned_to && <p className="text-xs text-red-600">{errors.assigned_to.message}</p>}<p className="mt-1 text-xs text-slate-400">The backend does not currently expose a user directory.</p></div>
        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button disabled={isSubmitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? 'Saving...' : task ? 'Save changes' : 'Create task'}</button></div>
      </form>
    </div>
  </div>;
};
