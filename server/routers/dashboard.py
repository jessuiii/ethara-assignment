"""Dashboard route — aggregated stats across user's projects."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.models import Task, ProjectMember, User
from server.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ── GET /api/dashboard ───────────────────────────
@router.get("")
async def dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get all project IDs the user belongs to
    mem_result = await db.execute(
        select(ProjectMember.project_id).where(
            ProjectMember.user_id == current_user.id
        )
    )
    project_ids = [row[0] for row in mem_result.all()]

    if not project_ids:
        return {
            "totalTasks": 0,
            "tasksByStatus": {"todo": 0, "in_progress": 0, "done": 0},
            "tasksPerUser": [],
            "overdueTasks": 0,
        }

    # Total tasks
    total_result = await db.execute(
        select(func.count(Task.id)).where(Task.project_id.in_(project_ids))
    )
    total_tasks = total_result.scalar() or 0

    # Tasks by status
    status_result = await db.execute(
        select(Task.status, func.count(Task.id))
        .where(Task.project_id.in_(project_ids))
        .group_by(Task.status)
    )
    tasks_by_status = {"todo": 0, "in_progress": 0, "done": 0}
    for status, count in status_result.all():
        tasks_by_status[status] = count

    # Tasks per user (only assigned tasks)
    tpu_result = await db.execute(
        select(
            User.id,
            User.name,
            User.email,
            func.count(Task.id).label("count"),
        )
        .join(Task, Task.assigned_to == User.id)
        .where(
            Task.project_id.in_(project_ids),
            Task.assigned_to.isnot(None),
        )
        .group_by(User.id, User.name, User.email)
    )
    tasks_per_user = [
        {"id": str(uid), "name": name, "email": email, "count": count}
        for uid, name, email, count in tpu_result.all()
    ]

    # Overdue tasks (due_date < today AND status != 'done')
    today = date.today()
    overdue_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.project_id.in_(project_ids),
            Task.due_date < today,
            Task.status != "done",
        )
    )
    overdue_tasks = overdue_result.scalar() or 0

    return {
        "totalTasks": total_tasks,
        "tasksByStatus": tasks_by_status,
        "tasksPerUser": tasks_per_user,
        "overdueTasks": overdue_tasks,
    }
