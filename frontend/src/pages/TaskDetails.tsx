import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Edit3, MessageSquare, Send, Trash2, UserRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../services/authService';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { ProjectsShell } from '../components/projects/ProjectsShell';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { useAuth } from '../contexts/AuthContext';

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not set';
const label = (value: string) => value.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const TaskDetails: React.FC = () => {
  const { taskId } = useParams();
  const id = Number(taskId);
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [comment, setComment] = useState('');
  const task = useQuery({ queryKey: ['tasks', id], queryFn: () => taskService.get(id), enabled: id > 0 });
  const comments = useQuery({ queryKey: ['tasks', id, 'comments'], queryFn: () => taskService.listComments(id), enabled: task.isSuccess });
  const project = useQuery({ queryKey: ['projects', task.data?.project_id], queryFn: () => projectService.get(task.data!.project_id), enabled: Boolean(task.data?.project_id) });
  const update = useMutation({ mutationFn: async ({ assigned_to, ...data }: Parameters<typeof taskService.update>[1] & { assigned_to?: number | null }) => { const updated = await taskService.update(id, data); if (assigned_to !== undefined && assigned_to !== task.data?.assigned_to) await taskService.updateAssignee(id, assigned_to); return updated; }, onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['tasks', id] }), client.invalidateQueries({ queryKey: ['tasks'] }), client.invalidateQueries({ queryKey: ['kanban'] }), client.invalidateQueries({ queryKey: ['dashboard'] })]); setEditOpen(false); } });
  const remove = useMutation({ mutationFn: () => taskService.remove(id), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['tasks'] }); navigate(`/projects/${task.data?.project_id}`); } });
  const addComment = useMutation({ mutationFn: (value: string) => taskService.createComment(id, value), onSuccess: async () => { setComment(''); await client.invalidateQueries({ queryKey: ['tasks', id, 'comments'] }); } });
  const editComment = useMutation({ mutationFn: ({ commentId, value }: { commentId: number; value: string }) => taskService.updateComment(commentId, value), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['tasks', id, 'comments'] }); } });
  const deleteComment = useMutation({ mutationFn: (commentId: number) => taskService.removeComment(commentId), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['tasks', id, 'comments'] }); } });

  if (task.isLoading) return <ProjectsShell title="Task details" subtitle="Loading task information."><div className="h-80 animate-pulse rounded-2xl bg-white" /></ProjectsShell>;
  if (task.isError || !task.data) return <ProjectsShell title="Task details" subtitle="Task information"><div className="rounded-2xl bg-white p-10 text-center"><h2 className="font-bold">Task unavailable</h2><p className="mt-2 text-sm text-slate-500">{getApiErrorMessage(task.error, 'You may not have access to this task.')}</p><Link to="/tasks" className="mt-4 inline-block font-semibold text-blue-600">Back to tasks</Link></div></ProjectsShell>;
  const data = task.data;
  return <ProjectsShell title="Task details" subtitle="Review task progress and discussion.">
    <div className="mb-5"><Link to={project.data ? `/projects/${project.data.id}` : '/tasks'} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"><ArrowLeft className="h-4 w-4" />Back to project</Link></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold uppercase text-blue-600">{label(data.status)}</span><h2 className="mt-4 text-2xl font-bold text-slate-900">{data.title}</h2></div><div className="flex gap-2"><button type="button" onClick={() => setEditOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"><Edit3 className="h-4 w-4" />Edit</button><button type="button" onClick={() => { if (window.confirm('Delete this task?')) void remove.mutateAsync(); }} className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-sm font-semibold text-red-600"><Trash2 className="h-4 w-4" />Delete</button></div></div><p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-600">{data.description || 'No description provided.'}</p><div className="mt-8 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-3"><div><p className="text-xs text-slate-400">Priority</p><p className="mt-1 text-sm font-semibold text-slate-800">{label(data.priority)}</p></div><div><p className="text-xs text-slate-400">Due date</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-800"><CalendarDays className="h-4 w-4 text-blue-600" />{formatDate(data.due_date)}</p></div><div><p className="text-xs text-slate-400">Assignee</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-800"><UserRound className="h-4 w-4 text-violet-600" />{data.assigned_to ? `User ${data.assigned_to}` : 'Unassigned'}</p></div></div></section>
      <section className="rounded-2xl bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-blue-600" /><h3 className="font-bold text-slate-900">Comments</h3></div><div className="mt-5 space-y-4">{comments.data?.items.length ? comments.data.items.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><p className="text-sm leading-6 text-slate-700">{item.comment}</p><div className="mt-2 flex items-center justify-between text-[11px] text-slate-400"><span>User {item.user_id} · {formatDate(item.created_at)}</span>{item.user_id === user?.id && <span className="flex gap-2"><button type="button" onClick={() => { const value = window.prompt('Edit comment', item.comment); if (value?.trim()) void editComment.mutateAsync({ commentId: item.id, value: value.trim() }); }} className="font-semibold text-blue-600">Edit</button><button type="button" onClick={() => { if (window.confirm('Delete this comment?')) void deleteComment.mutateAsync(item.id); }} className="font-semibold text-red-600">Delete</button></span>}</div></div>) : <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No comments yet.</p>}</div><form onSubmit={(event) => { event.preventDefault(); if (comment.trim()) void addComment.mutateAsync(comment.trim()); }} className="mt-5 flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} maxLength={5000} placeholder="Add a comment..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><button type="submit" disabled={!comment.trim() || addComment.isPending} aria-label="Add comment" className="rounded-xl bg-blue-600 p-3 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button></form>{(addComment.isError || editComment.isError || deleteComment.isError) && <p className="mt-3 text-xs text-red-600">{getApiErrorMessage(addComment.error ?? editComment.error ?? deleteComment.error, 'Comment action failed.')}</p>}</section>
    </div>
    {editOpen && <TaskFormModal projects={project.data ? [project.data] : []} task={data} isSubmitting={update.isPending} onClose={() => setEditOpen(false)} onSubmit={async ({ projectId: _, status: __, ...formData }) => { await update.mutateAsync(formData); }} />}
    {remove.isError && <p className="mt-4 text-sm text-red-600">{getApiErrorMessage(remove.error, 'Unable to delete task.')}</p>}
  </ProjectsShell>;
};
