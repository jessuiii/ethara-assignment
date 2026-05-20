"""Project routes — CRUD, members, member-suggestions."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.database import get_db
from server.models import Project, ProjectMember, User, Task
from server.schemas import (
    ProjectCreate,
    ProjectUpdate,
    MemberAdd,
    UserOut,
    ProjectMemberOut,
)
from server.auth import get_current_user, require_project_role

router = APIRouter(prefix="/api/projects", tags=["projects"])


# ── helpers ──────────────────────────────────────

def _serialize_user(u: User) -> dict:
    return {"id": str(u.id), "name": u.name, "email": u.email}


def _serialize_member(pm: ProjectMember) -> dict:
    return {
        "id": str(pm.id),
        "project_id": str(pm.project_id),
        "user_id": str(pm.user_id),
        "role": pm.role,
        "joined_at": pm.joined_at.isoformat() if pm.joined_at else None,
        "user": _serialize_user(pm.user) if pm.user else None,
    }


def _serialize_project(p: Project) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "description": p.description or "",
        "created_by": str(p.created_by),
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "creator": _serialize_user(p.creator) if p.creator else None,
        "projectMembers": [_serialize_member(pm) for pm in (p.project_members or [])],
    }


async def _load_project(db, project_id):
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.creator),
            selectinload(Project.project_members).selectinload(ProjectMember.user),
        )
        .where(Project.id == project_id)
    )
    return result.scalar_one_or_none()


# ── POST /api/projects ───────────────────────────
@router.post("", status_code=201)
async def create_project(
    body: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        name=body.name.strip(),
        description=(body.description or "").strip(),
        created_by=current_user.id,
    )
    db.add(project)
    await db.flush()

    # Creator becomes admin
    membership = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role="admin",
    )
    db.add(membership)
    await db.commit()

    full = await _load_project(db, project.id)
    return {"project": _serialize_project(full)}


# ── GET /api/projects ────────────────────────────
@router.get("")
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get user's memberships
    mem_result = await db.execute(
        select(ProjectMember).where(ProjectMember.user_id == current_user.id)
    )
    memberships = mem_result.scalars().all()
    project_ids = [m.project_id for m in memberships]
    role_map = {m.project_id: m.role for m in memberships}

    if not project_ids:
        return {"projects": []}

    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.creator),
            selectinload(Project.project_members).selectinload(ProjectMember.user),
        )
        .where(Project.id.in_(project_ids))
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()

    out = []
    for p in projects:
        d = _serialize_project(p)
        d["currentUserRole"] = role_map.get(p.id)
        out.append(d)

    return {"projects": out}


# ── GET /api/projects/{project_id} ───────────────
@router.get("/{project_id}")
async def get_project(
    project_id: UUID,
    membership: ProjectMember = Depends(require_project_role("admin", "member")),
    db: AsyncSession = Depends(get_db),
):
    full = await _load_project(db, project_id)
    if not full:
        raise HTTPException(status_code=404, detail="Project not found")

    d = _serialize_project(full)
    d["currentUserRole"] = membership.role
    return {"project": d}


# ── PUT /api/projects/{project_id} ───────────────
@router.put("/{project_id}")
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    membership: ProjectMember = Depends(require_project_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if body.name is not None:
        project.name = body.name.strip()
    if body.description is not None:
        project.description = body.description.strip()

    await db.commit()

    full = await _load_project(db, project_id)
    return {"project": _serialize_project(full)}


# ── DELETE /api/projects/{project_id} ────────────
@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    membership: ProjectMember = Depends(require_project_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Delete tasks, then members, then project
    await db.execute(
        Task.__table__.delete().where(Task.project_id == project_id)
    )
    await db.execute(
        ProjectMember.__table__.delete().where(ProjectMember.project_id == project_id)
    )
    await db.delete(project)
    await db.commit()

    return {"message": "Project deleted successfully"}


# ── GET /api/projects/{project_id}/member-suggestions ──
@router.get("/{project_id}/member-suggestions")
async def member_suggestions(
    project_id: UUID,
    q: str = "",
    membership: ProjectMember = Depends(require_project_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    search_term = q.strip()
    if not search_term or len(search_term) > 100:
        raise HTTPException(status_code=400, detail="Search query is required")

    # Get existing member IDs
    mem_result = await db.execute(
        select(ProjectMember.user_id).where(ProjectMember.project_id == project_id)
    )
    existing_ids = [row[0] for row in mem_result.all()]

    query = select(User).where(
        User.id.notin_(existing_ids) if existing_ids else True,
        or_(
            User.name.ilike(f"%{search_term}%"),
            User.email.ilike(f"%{search_term}%"),
        ),
    ).order_by(User.name.asc()).limit(8)

    result = await db.execute(query)
    users = result.scalars().all()

    return {"users": [_serialize_user(u) for u in users]}


# ── POST /api/projects/{project_id}/members ──────
@router.post("/{project_id}/members", status_code=201)
async def add_member(
    project_id: UUID,
    body: MemberAdd,
    membership: ProjectMember = Depends(require_project_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == body.email.lower())
    )
    user_to_add = result.scalar_one_or_none()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User not found with that email")

    # Check if already member
    existing = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_to_add.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409, detail="User is already a member of this project"
        )

    role = body.role if body.role in ("admin", "member") else "member"
    new_member = ProjectMember(
        project_id=project_id,
        user_id=user_to_add.id,
        role=role,
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)

    # Reload with user relation
    result = await db.execute(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .where(ProjectMember.id == new_member.id)
    )
    full_member = result.scalar_one()

    return {"member": _serialize_member(full_member)}


# ── DELETE /api/projects/{project_id}/members/{user_id} ──
@router.delete("/{project_id}/members/{user_id}")
async def remove_member(
    project_id: UUID,
    user_id: UUID,
    membership: ProjectMember = Depends(require_project_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    # Prevent removing the project creator
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project and project.created_by == user_id:
        raise HTTPException(
            status_code=400, detail="Cannot remove the project creator"
        )

    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    mem = result.scalar_one_or_none()
    if not mem:
        raise HTTPException(
            status_code=404, detail="Member not found in this project"
        )

    # Unassign tasks from the removed member
    from sqlalchemy import update

    await db.execute(
        update(Task)
        .where(Task.project_id == project_id, Task.assigned_to == user_id)
        .values(assigned_to=None)
    )

    await db.delete(mem)
    await db.commit()

    return {"message": "Member removed successfully"}
