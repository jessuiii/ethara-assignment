"""Task routes — CRUD with role-based access control."""

from uuid import UUID
from typing import Optional, Union, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.database import get_db
from server.models import Task, User, Project, ProjectMember
from server.schemas import TaskCreate, TaskUpdate
from server.auth import get_current_user, require_project_role

router = APIRouter(
    prefix="/api/projects/{project_id}/tasks", tags=["tasks"]
)


# ── helpers ──────────────────────────────────────

def _serialize_user(u: Optional[User]) -> Optional[Dict[str, Any]]:
    if u is None:
        return None
    return {"id": str(u.id), "name": u.name, "email": u.email}


def _serialize_task(t: Task) -> dict:
    return {
        "id": str(t.id),
        "project_id": str(t.project_id),
        "title": t.title,
        "description": t.description or "",
        "status": t.status,
        "priority": t.priority,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "assigned_to": str(t.assigned_to) if t.assigned_to else None,
        "created_by": str(t.created_by),
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        "assignee": _serialize_user(t.assignee),
        "creator": _serialize_user(t.creator),
    }


async def _load_task(db, task_id):
    result = await db.execute(
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.creator),
        )
        .where(Task.id == task_id)
    )
    return result.scalar_one_or_none()


# ── GET /api/projects/{project_id}/tasks ─────────
@router.get("")
async def list_tasks(
    project_id: UUID,
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    membership: ProjectMember = Depends(require_project_role("admin", "member")),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conditions = [Task.project_id == project_id]

    # Members can only see tasks assigned to themselves
    if membership.role == "member":
        conditions.append(Task.assigned_to == current_user.id)

    # Optional filters
    if status:
        if status not in ("todo", "in_progress", "done"):
            raise HTTPException(
                status_code=400, detail="Status must be todo, in_progress, or done"
            )
        conditions.append(Task.status == status)

    if priority:
        if priority not in ("low", "medium", "high"):
            raise HTTPException(
                status_code=400, detail="Priority must be low, medium, or high"
            )
        conditions.append(Task.priority == priority)

    if assigned_to:
        if membership.role == "member" and assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Members can only filter tasks assigned to themselves",
            )
        conditions.append(Task.assigned_to == assigned_to)

    result = await db.execute(
        select(Task)
        .options(selectinload(Task.assignee), selectinload(Task.creator))
        .where(*conditions)
        .order_by(Task.priority.asc(), Task.created_at.desc())
    )
    tasks = result.scalars().all()

    return {"tasks": [_serialize_task(t) for t in tasks]}


# ── GET /api/projects/{project_id}/tasks/{task_id} ──
@router.get("/{task_id}")
async def get_task(
    project_id: UUID,
    task_id: UUID,
    membership: ProjectMember = Depends(require_project_role("admin", "member")),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conditions = [Task.id == task_id, Task.project_id == project_id]
    if membership.role == "member":
        conditions.append(Task.assigned_to == current_user.id)

    result = await db.execute(
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.creator),
            selectinload(Task.project),
        )
        .where(*conditions)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    d = _serialize_task(task)
    d["project"] = {"id": str(task.project.id), "name": task.project.name} if task.project else None
    return {"task": d}


# ── POST /api/projects/{project_id}/tasks ────────
@router.post("", status_code=201)
async def create_task(
    project_id: UUID,
    body: TaskCreate,
    membership: ProjectMember = Depends(require_project_role("admin")),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate assigned_to is a project member
    if body.assigned_to:
        result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == body.assigned_to,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Assigned user is not a member of this project",
            )

    task = Task(
        project_id=project_id,
        title=body.title.strip(),
        description=(body.description or "").strip(),
        status=body.status or "todo",
        priority=body.priority or "medium",
        due_date=body.due_date,
        assigned_to=body.assigned_to,
        created_by=current_user.id,
    )
    db.add(task)
    await db.commit()

    full = await _load_task(db, task.id)
    return {"task": _serialize_task(full)}


# ── PUT /api/projects/{project_id}/tasks/{task_id} ──
@router.put("/{task_id}")
async def update_task(
    project_id: UUID,
    task_id: UUID,
    body: TaskUpdate,
    membership: ProjectMember = Depends(require_project_role("admin", "member")),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if membership.role == "member":
        # Members can only update status on their own tasks
        if task.assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only update tasks assigned to you",
            )

        update_data = body.model_dump(exclude_unset=True)
        allowed_fields = {"status"}
        disallowed = set(update_data.keys()) - allowed_fields
        if disallowed:
            raise HTTPException(
                status_code=403,
                detail=f"Members can only update task status. Cannot modify: {', '.join(disallowed)}",
            )

        if body.status is not None:
            task.status = body.status
    else:
        # Admin: can update everything
        if body.title is not None:
            task.title = body.title.strip()
        if body.description is not None:
            task.description = body.description.strip()
        if body.status is not None:
            task.status = body.status
        if body.priority is not None:
            task.priority = body.priority
        if body.due_date is not None:
            task.due_date = body.due_date

        update_data = body.model_dump(exclude_unset=True)
        if "assigned_to" in update_data:
            new_assignee = body.assigned_to
            if new_assignee:
                result2 = await db.execute(
                    select(ProjectMember).where(
                        ProjectMember.project_id == project_id,
                        ProjectMember.user_id == new_assignee,
                    )
                )
                if not result2.scalar_one_or_none():
                    raise HTTPException(
                        status_code=400,
                        detail="Assigned user is not a member of this project",
                    )
            task.assigned_to = new_assignee

    await db.commit()

    full = await _load_task(db, task.id)
    return {"task": _serialize_task(full)}


# ── DELETE /api/projects/{project_id}/tasks/{task_id} ──
@router.delete("/{task_id}")
async def delete_task(
    project_id: UUID,
    task_id: UUID,
    membership: ProjectMember = Depends(require_project_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()

    return {"message": "Task deleted successfully"}
