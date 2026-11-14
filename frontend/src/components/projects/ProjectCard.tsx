import React from 'react';
import { ArrowUpRight, CalendarDays, FolderKanban } from 'lucide-react';
import type { Project } from '../../services/projectService';

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));

export const ProjectCard: React.FC<{ project: Project; onOpen: () => void }> = ({ project, onOpen }) => (
  <button type="button" onClick={onOpen} className="group text-left rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-4">
      <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><FolderKanban className="h-5 w-5" /></div>
      <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:text-blue-600" />
    </div>
    <h2 className="mt-5 truncate text-lg font-bold text-slate-900">{project.name}</h2>
    <p className="mt-2 min-h-10 line-clamp-2 text-sm leading-5 text-slate-500">{project.description || 'No description provided.'}</p>
    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
      <span>Owner ID: {project.owner_id}</span>
      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(project.created_at)}</span>
    </div>
  </button>
);
