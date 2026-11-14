import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, CheckCircle2, Edit3, Trash2, Users, AlertCircle } from 'lucide-react';
import { getApiErrorMessage } from '../services/authService';
import { projectService } from '../services/projectService';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { ProjectsShell } from '../components/projects/ProjectsShell';

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value));

export const ProjectDetails: React.FC = () => {
  const { projectId } = useParams();
  const id = Number(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditOpen, setEditOpen] = useState(false);
  const project = useQuery({ queryKey: ['projects', id], queryFn: () => projectService.get(id), enabled: Number.isInteger(id) && id > 0 });
  const tasks = useQuery({ queryKey: ['projects', id, 'tasks'], queryFn: () => projectService.listTasks(id), enabled: project.isSuccess });
  const update = useMutation({ mutationFn: (data: { name: string; description: string | null }) => projectService.update(id, data), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['projects'] }), queryClient.invalidateQueries({ queryKey: ['projects', id] })]); setEditOpen(false); } });
  const remove = useMutation({ mutationFn: () => projectService.remove(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['projects'] }); navigate('/projects'); } });

  if (project.isLoading) return <ProjectsShell title="Project details" subtitle="Loading project information."><div className="h-80 animate-pulse rounded-2xl bg-white" /></ProjectsShell>;
  if (project.isError || !project.data) return <ProjectsShell title="Project details" subtitle="Project information"><div className="rounded-2xl bg-white p-10 text-center shadow-sm"><AlertCircle className="mx-auto h-8 w-8 text-red-500" /><h2 className="mt-3 font-bold text-slate-900">Project unavailable</h2><p className="mt-2 text-sm text-slate-500">{getApiErrorMessage(project.error, 'This project may not exist or you may not have access.')}</p><Link to="/projects" className="mt-5 inline-block font-semibold text-blue-600">Back to projects</Link></div></ProjectsShell>;

  const data = project.data;
  const confirmDelete = () => { if (window.confirm(`Delete "${data.name}"? This cannot be undone.`)) void remove.mutateAsync(); };

  return <ProjectsShell title="Project details" subtitle="Review project information and related work.">
    <div className="mb-5"><Link to="/projects" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"><ArrowLeft className="h-4 w-4" />All projects</Link></div>
    <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row"><div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Project</p><h2 className="mt-2 text-3xl font-bold text-slate-900">{data.name}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{data.description || 'No description provided.'}</p></div><div className="flex gap-2"><button type="button" onClick={() => setEditOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Edit3 className="h-4 w-4" />Edit</button><button type="button" onClick={confirmDelete} disabled={remove.isPending} className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />Delete</button></div></div>
      <div className="mt-7 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3"><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-slate-400">Created</p><p className="text-sm font-semibold text-slate-800">{formatDate(data.created_at)}</p></div></div><div className="flex items-center gap-3"><Users className="h-5 w-5 text-violet-600" /><div><p className="text-xs text-slate-400">Owner</p><p className="text-sm font-semibold text-slate-800">User ID {data.owner_id}</p></div></div><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-xs text-slate-400">Related tasks</p><p className="text-sm font-semibold text-slate-800">{tasks.isLoading ? 'Loading...' : tasks.data?.total ?? 0}</p></div></div></div>
    </section>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl bg-white p-6 shadow-sm"><h3 className="text-base font-bold text-slate-900">Related tasks</h3>{tasks.isError ? <p className="mt-5 text-sm text-red-600">{getApiErrorMessage(tasks.error, 'Unable to load tasks.')}</p> : tasks.data?.items.length ? <div className="mt-4 divide-y divide-slate-100">{tasks.data.items.map((task) => <div key={task.id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{task.title}</p><p className="mt-1 text-xs capitalize text-slate-500">{task.status.replace('_', ' ')} · {task.priority} priority</p></div><span className="text-xs text-slate-400">{task.assigned_to ? `User ${task.assigned_to}` : 'Unassigned'}</span></div>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No tasks are associated with this project yet.</p>}</section>
      <section className="rounded-2xl bg-white p-6 shadow-sm"><h3 className="text-base font-bold text-slate-900">Project members</h3><div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-sm leading-6 text-slate-500">The current backend provides project ownership but does not expose project member listing or membership actions. No membership data is fabricated here.</div></section>
    </div>
    {isEditOpen && <ProjectFormModal project={data} isSubmitting={update.isPending} onClose={() => { setEditOpen(false); update.reset(); }} onSubmit={async (formData) => { await update.mutateAsync(formData); }} />}
    {(update.isError || remove.isError) && <div role="alert" className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white">{getApiErrorMessage(update.error ?? remove.error, 'Unable to save project changes.')}</div>}
  </ProjectsShell>;
};
