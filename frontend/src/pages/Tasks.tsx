import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronLeft, ChevronRight, Plus, Search, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../services/authService';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import type { TaskPriority, TaskStatus } from '../types';
import { ProjectsShell } from '../components/projects/ProjectsShell';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskFormModal } from '../components/tasks/TaskFormModal';

export const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [projectId, setProjectId] = useState<number>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const projects = useQuery({ queryKey: ['projects'], queryFn: projectService.list });
  const selectedProjectId = projectId ?? projects.data?.[0]?.id;
  const tasks = useQuery({ queryKey: ['tasks', selectedProjectId, status, priority, page], queryFn: () => taskService.list(selectedProjectId!, { status: status || undefined, priority: priority || undefined, limit: 12, offset: page * 12 }), enabled: Boolean(selectedProjectId) });
  const create = useMutation({ mutationFn: ({ projectId: id, ...data }: Parameters<typeof taskService.create>[1] & { projectId: number }) => taskService.create(id, data), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['tasks'] }); await client.invalidateQueries({ queryKey: ['projects'] }); setCreateOpen(false); } });
  const displayed = useMemo(() => tasks.data?.items.filter((task) => task.title.toLowerCase().includes(search.toLowerCase()) || task.description?.toLowerCase().includes(search.toLowerCase())), [search, tasks.data]);
  const totalPages = tasks.data ? Math.ceil(tasks.data.total / tasks.data.limit) : 0;

  return <ProjectsShell title="Tasks" subtitle="Manage work across your projects.">
    <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm" /></div><select value={selectedProjectId ?? ''} onChange={(event) => { setProjectId(Number(event.target.value)); setPage(0); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Select project</option>{projects.data?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><TaskFilters status={status} priority={priority} onStatus={(value) => { setStatus(value); setPage(0); }} onPriority={(value) => { setPriority(value); setPage(0); }} /></div><button type="button" onClick={() => setCreateOpen(true)} disabled={!selectedProjectId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />New task</button></div>
    {tasks.isLoading || projects.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-xl bg-white" />)}</div> : tasks.isError ? <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><AlertCircle className="mx-auto h-8 w-8 text-red-500" /><h2 className="mt-3 font-bold">Unable to load tasks</h2><p className="mt-1 text-sm text-slate-500">{getApiErrorMessage(tasks.error, 'Please try again.')}</p><button type="button" onClick={() => void tasks.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><RefreshCw className="h-4 w-4" />Try again</button></div> : displayed?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{displayed.map((task) => <TaskCard key={task.id} task={task} onOpen={() => navigate(`/tasks/${task.id}`)} />)}</div> : <div className="rounded-2xl bg-white p-12 text-center shadow-sm"><h2 className="font-bold">{selectedProjectId ? 'No tasks found' : 'Select a project'}</h2><p className="mt-2 text-sm text-slate-500">{selectedProjectId ? 'Create a task or adjust your filters.' : 'Choose a project to view its tasks.'}</p></div>}
    {tasks.data && totalPages > 1 && <div className="mt-6 flex items-center justify-center gap-3"><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span><button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>}
    {createOpen && <TaskFormModal projects={projects.data ?? []} defaultProjectId={selectedProjectId} isSubmitting={create.isPending} onClose={() => { setCreateOpen(false); create.reset(); }} onSubmit={async ({ projectId: id, ...data }) => { await create.mutateAsync({ projectId: id, ...data }); }} />}
    {create.isError && <div role="alert" className="fixed bottom-5 right-5 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white">{getApiErrorMessage(create.error, 'Unable to create task.')}</div>}
  </ProjectsShell>;
};
