"""Pydantic v2 schemas for request validation and response serialization."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Auth ──────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


# ── User output ──────────────────────────────────

class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Project ──────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


# ── Member ───────────────────────────────────────

class MemberAdd(BaseModel):
    email: EmailStr
    role: Optional[str] = "member"


class MemberOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime
    user: UserOut

    model_config = {"from_attributes": True}


class ProjectMemberOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime
    user: UserOut

    model_config = {"from_attributes": True}


# ── Project output ───────────────────────────────

class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = ""
    created_by: uuid.UUID
    created_at: datetime
    creator: UserOut
    projectMembers: list[ProjectMemberOut] = []

    model_config = {"from_attributes": True}


class ProjectWithRole(ProjectOut):
    currentUserRole: Optional[str] = None


# ── Task ─────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = ""
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[date] = None
    assigned_to: Optional[uuid.UUID] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    assigned_to: Optional[uuid.UUID] = None


class TaskOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: Optional[str] = ""
    status: str
    priority: str
    due_date: Optional[date] = None
    assigned_to: Optional[uuid.UUID] = None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    assignee: Optional[UserOut] = None
    creator: UserOut

    model_config = {"from_attributes": True}


class TaskWithProjectOut(TaskOut):
    project: Optional[ProjectBrief] = None


class ProjectBrief(BaseModel):
    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


# Fix forward reference for TaskWithProjectOut
TaskWithProjectOut.model_rebuild()


# ── Dashboard ────────────────────────────────────

class TasksByStatus(BaseModel):
    todo: int = 0
    in_progress: int = 0
    done: int = 0


class TaskPerUser(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    count: int


class DashboardOut(BaseModel):
    totalTasks: int
    tasksByStatus: TasksByStatus
    tasksPerUser: list[TaskPerUser]
    overdueTasks: int
