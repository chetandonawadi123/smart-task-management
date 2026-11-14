import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { getApiErrorMessage } from '../services/authService';
import { projectService } from '../services/projectService';
import { ProjectCard } from '../components/projects/ProjectCard';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { ProjectsShell } from '../components/projects/ProjectsShell';
import { Link, useNavigate } from 'react-router-dom';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const projects = useQuery({ queryKey: ['projects'], queryFn: projectService.list });
  const create = useMutation({
    mutationFn: projectService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCreateOpen(false);
    },
  });
  const filteredProjects = projects.data?.filter((project) => {
    const term = search.toLowerCase();
    return project.name.toLowerCase().includes(term) || project.description?.toLowerCase().includes(term);
  });

  return (
    <ProjectsShell title="Projects" subtitle="Plan, organize, and track your organization’s work.">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search projects" placeholder="Search projects..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none ring-blue-500 focus:ring-2" /></div>
        <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />New project</button>
      </div>
      {projects.isLoading ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-56 animate-pulse rounded-2xl bg-white" />)}</div> : projects.isError ? <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><AlertCircle className="mx-auto h-8 w-8 text-red-500" /><h2 className="mt-3 font-bold text-slate-900">Unable to load projects</h2><p className="mt-1 text-sm text-slate-500">{getApiErrorMessage(projects.error, 'Please try again.')}</p><button type="button" onClick={() => void projects.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><RefreshCw className="h-4 w-4" />Try again</button></div> : filteredProjects?.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredProjects.map((project) => <ProjectCard key={project.id} project={project} onOpen={() => navigate(`/projects/${project.id}`)} />)}</div> : <div className="rounded-2xl bg-white p-12 text-center shadow-sm"><h2 className="font-bold text-slate-900">{search ? 'No matching projects' : 'No projects yet'}</h2><p className="mt-2 text-sm text-slate-500">{search ? 'Try another search term.' : 'Create your first project to get started.'}</p>{!search && <button type="button" onClick={() => setCreateOpen(true)} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Create project</button>}</div>}
      <p className="mt-6 text-sm text-slate-500"><Link to="/dashboard" className="font-semibold text-blue-600 hover:text-blue-700">Back to dashboard</Link></p>
      {isCreateOpen && <ProjectFormModal isSubmitting={create.isPending} onClose={() => { setCreateOpen(false); create.reset(); }} onSubmit={async (data) => { await create.mutateAsync(data); }} />}
      {create.isError && <div role="alert" className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white">{getApiErrorMessage(create.error, 'Unable to create project.')}</div>}
    </ProjectsShell>
  );
};
