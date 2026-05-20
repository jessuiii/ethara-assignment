from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Text, ForeignKey, Enum, Date, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from server.database import Base


# ── User ──────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow
    )

    # relationships
    created_projects: Mapped[List[Project]] = relationship(
        back_populates="creator", foreign_keys="Project.created_by"
    )
    memberships: Mapped[List[ProjectMember]] = relationship(
        back_populates="user", foreign_keys="ProjectMember.user_id"
    )
    assigned_tasks: Mapped[List[Task]] = relationship(
        back_populates="assignee", foreign_keys="Task.assigned_to"
    )
    created_tasks: Mapped[List[Task]] = relationship(
        back_populates="creator", foreign_keys="Task.created_by"
    )


# ── Project ───────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, default="")
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow
    )

    # relationships
    creator: Mapped[User] = relationship(
        back_populates="created_projects", foreign_keys=[created_by]
    )
    project_members: Mapped[List[ProjectMember]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    tasks: Mapped[List[Task]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


# ── ProjectMember ─────────────────────────────────
class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="unique_project_user"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        Enum("admin", "member", name="enum_project_members_role", create_type=False),
        nullable=False,
        default="member",
    )
    joined_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow
    )

    # relationships
    project: Mapped[Project] = relationship(back_populates="project_members")
    user: Mapped[User] = relationship(back_populates="memberships")


# ── Task ──────────────────────────────────────────
class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(
        Enum("todo", "in_progress", "done", name="enum_tasks_status", create_type=False),
        nullable=False,
        default="todo",
    )
    priority: Mapped[str] = mapped_column(
        Enum("low", "medium", "high", name="enum_tasks_priority", create_type=False),
        nullable=False,
        default="medium",
    )
    due_date: Mapped[Optional[str]] = mapped_column(Date, nullable=True)
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # relationships
    project: Mapped[Project] = relationship(back_populates="tasks")
    assignee: Mapped[Optional[User]] = relationship(
        back_populates="assigned_tasks", foreign_keys=[assigned_to]
    )
    creator: Mapped[User] = relationship(
        back_populates="created_tasks", foreign_keys=[created_by]
    )
