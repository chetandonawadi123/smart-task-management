import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { TaskStatus } from '../types';
import { ProjectsShell } from '../components/projects/ProjectsShell';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskFormModal } from '../components/tasks/TaskFormModal';

const columns: { status: TaskStatus; label: string; tone: string }[] = [{ status: TaskStatus.TODO, label: 'To Do', tone: 'border-slate-300' }, { status: TaskStatus.IN_PROGRESS, label: 'In Progress', tone: 'border-blue-400' }, { status: TaskStatus.IN_REVIEW, label: 'In Review', tone: 'border-violet-400' }, { status: TaskStatus.DONE, label: 'Done', tone: 'border-emerald-400' }];

export const Kanban: React.FC = () => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [projectId, setProjectId] = useState<number>();
  const [createOpen, setCreateOpen] = useState(false);
  const projects = useQuery({ queryKey: ['projects'], queryFn: projectService.list });
  const selectedProjectId = projectId ?? projects.data?.[0]?.id;
  const tasks = useQuery({ queryKey: ['kanban', selectedProjectId], queryFn: () => taskService.list(selectedProjectId!, { limit: 100, offset: 0 }), enabled: Boolean(selectedProjectId) });
  const move = useMutation({ mutationFn: ({ id, status }: { id: number; status: TaskStatus }) => taskService.updateStatus(id, status), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['kanban'] }), client.invalidateQueries({ queryKey: ['tasks'] }), client.invalidateQueries({ queryKey: ['dashboard'] })]); } });
  const handleDrop = (event: React.DragEvent, status: TaskStatus) => { const id = Number(event.dataTransfer.getData('taskId')); if (id) void move.mutateAsync({ id, status }); };

  return <ProjectsShell title="Kanban board" subtitle="Move work through your workflow."><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><select value={selectedProjectId ?? ''} onChange={(event) => setProjectId(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Select project</option>{projects.data?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button type="button" disabled={!selectedProjectId} onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />New task</button></div>
    <div className="grid gap-5 overflow-x-auto pb-4 lg:grid-cols-4">{columns.map((column) => <section key={column.status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, column.status)} className={`min-h-[28rem] min-w-[250px] rounded-2xl border-t-4 bg-slate-100/70 p-3 ${column.tone}`}><div className="mb-4 flex items-center justify-between px-1"><h2 className="text-sm font-bold text-slate-800">{column.label}</h2><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">{tasks.data?.items.filter((task) => task.status === column.status).length ?? 0}</span></div><div className="space-y-3">{tasks.data?.items.filter((task) => task.status === column.status).map((task) => <TaskCard key={task.id} task={task} onOpen={() => navigate(`/tasks/${task.id}`)} onDropStatus={() => undefined} />)}</div></section>)}</div>
    {tasks.isError && <p className="mt-4 text-sm text-red-600">Unable to load the board.</p>}{tasks.isLoading && <div className="mt-4 h-40 animate-pulse rounded-2xl bg-white" />}{createOpen && <TaskFormModal projects={projects.data ?? []} defaultProjectId={selectedProjectId} isSubmitting={false} onClose={() => setCreateOpen(false)} onSubmit={async ({ projectId: id, ...data }) => { await taskService.create(id, data); await client.invalidateQueries({ queryKey: ['kanban'] }); setCreateOpen(false); }} />}
  </ProjectsShell>;
};
