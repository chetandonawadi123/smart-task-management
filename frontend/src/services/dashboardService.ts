import api from '../lib/api';

export interface DashboardOverview {
  total_projects: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  in_review_tasks: number;
  overdue_tasks: number;
  unassigned_tasks: number;
  completion_percentage: number;
}

export interface StatusAnalytics {
  status: string;
  count: number;
}

export interface PriorityAnalytics {
  priority: string;
  count: number;
}

export interface TaskAnalytics {
  by_status: StatusAnalytics[];
  by_priority: PriorityAnalytics[];
  completed_vs_pending: Record<string, number>;
  assigned_vs_unassigned: Record<string, number>;
}

export interface ProjectAnalyticsItem {
  project_name: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_percentage: number;
}

export interface ProjectAnalytics {
  total_projects: number;
  projects: ProjectAnalyticsItem[];
}

export interface TeamAnalyticsItem {
  user_name: string;
  user_id: number;
  assigned_task_count: number;
  completed_task_count: number;
  pending_task_count: number;
}

export interface TeamAnalytics {
  members: TeamAnalyticsItem[];
}

export interface RecentActivityItem {
  type: string;
  id: number;
  title: string;
  created_at: string;
  author_name: string | null;
}

export interface RecentActivity {
  items: RecentActivityItem[];
  total: number;
  limit: number;
  offset: number;
}

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const response = await api.get<DashboardOverview>('/api/v1/dashboard/overview');
    return response.data;
  },

  async getTaskAnalytics(): Promise<TaskAnalytics> {
    const response = await api.get<TaskAnalytics>('/api/v1/dashboard/task-analytics');
    return response.data;
  },

  async getProjectAnalytics(): Promise<ProjectAnalytics> {
    const response = await api.get<ProjectAnalytics>('/api/v1/dashboard/project-analytics');
    return response.data;
  },

  async getTeamAnalytics(): Promise<TeamAnalytics> {
    const response = await api.get<TeamAnalytics>('/api/v1/dashboard/team-analytics');
    return response.data;
  },

  async getRecentActivity(): Promise<RecentActivity> {
    const response = await api.get<RecentActivity>('/api/v1/dashboard/recent-activity', {
      params: { limit: 20, offset: 0 },
    });
    return response.data;
  },
};
