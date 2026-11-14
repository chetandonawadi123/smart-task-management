export interface User {
  id: number;
  organization_id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface Task {
  id: number;
  project_id: number;
  created_by: number;
  assigned_to: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskListResponse {
  items: Task[];
  total: number;
  limit: number;
  offset: number;
}
