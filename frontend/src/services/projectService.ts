import api from '../lib/api';
import type { TaskListResponse } from '../types';

export interface Project {
  id: number;
  organization_id: number;
  owner_id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ProjectWrite {
  name: string;
  description: string | null;
}

export const projectService = {
  async list(): Promise<Project[]> {
    const response = await api.get<Project[]>('/api/v1/projects/');
    return response.data;
  },

  async get(projectId: number): Promise<Project> {
    const response = await api.get<Project>(`/api/v1/projects/${projectId}`);
    return response.data;
  },

  async create(data: ProjectWrite): Promise<Project> {
    const response = await api.post<Project>('/api/v1/projects/', data);
    return response.data;
  },

  async update(projectId: number, data: ProjectWrite): Promise<Project> {
    const response = await api.put<Project>(`/api/v1/projects/${projectId}`, data);
    return response.data;
  },

  async remove(projectId: number): Promise<void> {
    await api.delete(`/api/v1/projects/${projectId}`);
  },

  async listTasks(projectId: number): Promise<TaskListResponse> {
    const response = await api.get<TaskListResponse>(`/api/v1/projects/${projectId}/tasks/`, {
      params: { limit: 100, offset: 0 },
    });
    return response.data;
  },
};
