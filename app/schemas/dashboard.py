from pydantic import BaseModel, ConfigDict
from datetime import datetime

class DashboardOverview(BaseModel):
    total_projects: int
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    in_review_tasks: int
    overdue_tasks: int
    unassigned_tasks: int
    completion_percentage: float

class StatusAnalytics(BaseModel):
    status: str
    count: int

class PriorityAnalytics(BaseModel):
    priority: str
    count: int

class TaskAnalytics(BaseModel):
    by_status: list[StatusAnalytics]
    by_priority: list[PriorityAnalytics]
    completed_vs_pending: dict[str, int]
    assigned_vs_unassigned: dict[str, int]

class ProjectAnalyticsItem(BaseModel):
    project_name: str
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    completion_percentage: float

class ProjectAnalytics(BaseModel):
    total_projects: int
    projects: list[ProjectAnalyticsItem]

class TeamAnalyticsItem(BaseModel):
    user_name: str
    user_id: int
    assigned_task_count: int
    completed_task_count: int
    pending_task_count: int

class TeamAnalytics(BaseModel):
    members: list[TeamAnalyticsItem]

class RecentActivityItem(BaseModel):
    type: str  # "task" or "comment"
    id: int
    title: str
    created_at: datetime
    author_name: str | None = None

class RecentActivity(BaseModel):
    items: list[RecentActivityItem]
    total: int
    limit: int
    offset: int
