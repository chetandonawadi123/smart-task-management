import React, { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Project } from '../../services/projectService';

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(150, 'Project name is too long'),
  description: z.string().max(5000, 'Description is too long'),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormModalProps {
  project?: Project;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string | null }) => Promise<void>;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  project,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: project?.name ?? '', description: project?.description ?? '' },
  });

  useEffect(() => {
    reset({ name: project?.name ?? '', description: project?.description ?? '' });
  }, [project, reset]);

  const submit = async (data: ProjectFormValues) => {
    await onSubmit({ name: data.name.trim(), description: data.description.trim() || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="project-form-title">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="project-form-title" className="text-xl font-bold text-slate-900">{project ? 'Edit project' : 'Create project'}</h2>
            <p className="mt-1 text-sm text-slate-500">{project ? 'Update the project details.' : 'Set up a new workspace for your team.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(submit)} className="mt-6 space-y-5">
          <div>
            <label htmlFor="project-name" className="text-sm font-semibold text-slate-700">Project name</label>
            <input id="project-name" {...register('name')} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-blue-500 focus:ring-2" placeholder="Website redesign" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="project-description" className="text-sm font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea id="project-description" {...register('description')} rows={4} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-blue-500 focus:ring-2" placeholder="What is this project about?" />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Saving...' : project ? 'Save changes' : 'Create project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
