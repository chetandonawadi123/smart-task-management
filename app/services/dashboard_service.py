from datetime import datetime, timezone
from sqlalchemy import func, select, desc, literal
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.models.task_comment import TaskComment

def get_dashboard_overview(db: Session, org_id: int):
    total_projects = db.scalar(select(func.count(Project.id)).where(Project.organization_id == org_id)) or 0

    # Correct way to count: filter by org_id directly in the main query
    def count_tasks(filters=None):
        query = select(func.count(Task.id)).join(Project).where(Project.organization_id == org_id)
        if filters is not None:
            query = query.where(filters)
        return db.scalar(query) or 0

    total_tasks = count_tasks()
    completed_tasks = count_tasks(Task.status == 'done')
    pending_tasks = count_tasks(Task.status == 'todo')
    in_progress_tasks = count_tasks(Task.status == 'in_progress')
    in_review_tasks = count_tasks(Task.status == 'in_review')
    overdue_tasks = count_tasks((Task.status != 'done') & (Task.due_date < datetime.now(timezone.utc)))
    unassigned_tasks = count_tasks(Task.assigned_to == None)

    completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0

    return {
        "total_projects": total_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "in_progress_tasks": in_progress_tasks,
        "in_review_tasks": in_review_tasks,
        "overdue_tasks": overdue_tasks,
        "unassigned_tasks": unassigned_tasks,
        "completion_percentage": round(completion_percentage, 2)
    }

def get_task_analytics(db: Session, org_id: int):
    # Base query for tasks in org
    base_query = select(Task.status, Task.priority, Task.assigned_to).join(Project).where(Project.organization_id == org_id)

    # Execute aggregate queries
    by_status = db.execute(select(Task.status, func.count(Task.id)).join(Project).where(Project.organization_id == org_id).group_by(Task.status)).all()
    by_priority = db.execute(select(Task.priority, func.count(Task.id)).join(Project).where(Project.organization_id == org_id).group_by(Task.priority)).all()

    completed = db.scalar(select(func.count(Task.id)).join(Project).where(Project.organization_id == org_id).where(Task.status == 'done')) or 0
    pending = db.scalar(select(func.count(Task.id)).join(Project).where(Project.organization_id == org_id).where(Task.status != 'done')) or 0
    assigned = db.scalar(select(func.count(Task.id)).join(Project).where(Project.organization_id == org_id).where(Task.assigned_to != None)) or 0
    unassigned = db.scalar(select(func.count(Task.id)).join(Project).where(Project.organization_id == org_id).where(Task.assigned_to == None)) or 0

    return {
        "by_status": [{"status": s, "count": c} for s, c in by_status],
        "by_priority": [{"priority": p, "count": c} for p, c in by_priority],
        "completed_vs_pending": {"completed": completed, "pending": pending},
        "assigned_vs_unassigned": {"assigned": assigned, "unassigned": unassigned}
    }

def get_project_analytics(db: Session, org_id: int):
    projects = db.scalars(select(Project).where(Project.organization_id == org_id)).all()
    results = []

    for p in projects:
        tasks = p.tasks
        total = len(tasks)
        completed = sum(1 for t in tasks if t.status == 'done')
        pending = total - completed
        percent = (completed / total * 100) if total > 0 else 0.0
        results.append({
            "project_name": p.name,
            "total_tasks": total,
            "completed_tasks": completed,
            "pending_tasks": pending,
            "completion_percentage": round(percent, 2)
        })

    return {"total_projects": len(projects), "projects": results}

def get_team_analytics(db: Session, org_id: int):
    members = db.scalars(select(User).where(User.organization_id == org_id)).all()
    results = []
    for m in members:
        # Filter assigned tasks to ensure they belong to projects in the organization
        org_assigned_tasks = [t for t in m.assigned_tasks if t.project and t.project.organization_id == org_id]
        assigned = len(org_assigned_tasks)
        completed = sum(1 for t in org_assigned_tasks if t.status == 'done')
        results.append({
            "user_name": m.name,
            "user_id": m.id,
            "assigned_task_count": assigned,
            "completed_task_count": completed,
            "pending_task_count": assigned - completed
        })
    return {"members": results}

def get_recent_activity(db: Session, org_id: int, limit: int, offset: int):
    # Union tasks & comments created in org
    tasks_query = select(
        Task.id,
        Task.title,
        Task.created_at,
        literal("task").label("type"),
        User.name.label("author_name")
    ).join(Project, Task.project_id == Project.id).join(User, Task.created_by == User.id).where(Project.organization_id == org_id)

    comments_query = select(
        TaskComment.id,
        TaskComment.comment.label("title"),
        TaskComment.created_at,
        literal("comment").label("type"),
        User.name.label("author_name")
    ).join(Task, TaskComment.task_id == Task.id).join(Project, Task.project_id == Project.id).join(User, TaskComment.user_id == User.id).where(Project.organization_id == org_id)

    union_query = tasks_query.union_all(comments_query).subquery()

    total = db.scalar(select(func.count()).select_from(union_query)) or 0

    items = db.execute(
        select(union_query).order_by(desc(union_query.c.created_at)).limit(limit).offset(offset)
    ).all()

    activity_items = [
        {
            "type": row.type,
            "id": row.id,
            "title": row.title,
            "created_at": row.created_at,
            "author_name": row.author_name
        }
        for row in items
    ]

    return activity_items, total
