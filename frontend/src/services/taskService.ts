import api from '../lib/api';
import type { Task, TaskListResponse, TaskPriority, TaskStatus } from '../types';

export interface TaskWrite {
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  status?: TaskStatus;
  assigned_to?: number | null;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  created_at: string;
}

export interface TaskCommentListResponse {
  items: TaskComment[];
  total: number;
  limit: number;
  offset: number;
}

export const taskService = {
  async list(projectId: number, params: { status?: TaskStatus; priority?: TaskPriority; limit?: number; offset?: number } = {}): Promise<TaskListResponse> {
    const response = await api.get<TaskListResponse>(`/api/v1/projects/${projectId}/tasks/`, { params });
    return response.data;
  },
  async get(taskId: number): Promise<Task> {
    const response = await api.get<Task>(`/api/v1/tasks/${taskId}`);
    return response.data;
  },
  async create(projectId: number, data: TaskWrite): Promise<Task> {
    const response = await api.post<Task>(`/api/v1/projects/${projectId}/tasks/`, data);
    return response.data;
  },
  async update(taskId: number, data: TaskWrite): Promise<Task> {
    const response = await api.put<Task>(`/api/v1/tasks/${taskId}`, data);
    return response.data;
  },
  async remove(taskId: number): Promise<void> {
    await api.delete(`/api/v1/tasks/${taskId}`);
  },
  async updateStatus(taskId: number, status: TaskStatus): Promise<Task> {
    const response = await api.patch<Task>(`/api/v1/tasks/${taskId}/status`, { status });
    return response.data;
  },
  async updateAssignee(taskId: number, assigned_to: number | null): Promise<Task> {
    const response = await api.patch<Task>(`/api/v1/tasks/${taskId}/assignee`, { assigned_to });
    return response.data;
  },
  async listComments(taskId: number): Promise<TaskCommentListResponse> {
    const response = await api.get<TaskCommentListResponse>(`/api/v1/tasks/${taskId}/comments`, { params: { limit: 100, offset: 0 } });
    return response.data;
  },
  async createComment(taskId: number, comment: string): Promise<TaskComment> {
    const response = await api.post<TaskComment>(`/api/v1/tasks/${taskId}/comments`, { comment });
    return response.data;
  },
  async updateComment(commentId: number, comment: string): Promise<TaskComment> {
    const response = await api.put<TaskComment>(`/api/v1/comments/${commentId}`, { comment });
    return response.data;
  },
  async removeComment(commentId: number): Promise<void> {
    await api.delete(`/api/v1/comments/${commentId}`);
  },
};
