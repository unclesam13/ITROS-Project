from datetime import date, datetime, time, timezone
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.enums import IntakeChannel, RoutingStatus, TaskPriority, TaskStatus, UserRole


class UserBrief(BaseModel):
    id: UUID
    full_name: str

    model_config = {"from_attributes": True}


class ClassificationRead(BaseModel):
    category: str
    predicted_priority: TaskPriority
    confidence: float
    model_version: str
    processing_time_ms: int

    model_config = {"from_attributes": True}


class RoutingRead(BaseModel):
    status: RoutingStatus
    score: float | None
    processing_time_ms: int
    rationale_summary: str | None = None
    applied_user_id: UUID | None = None

    model_config = {"from_attributes": True}


def _normalize_deadline(value: datetime | date | str | None) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    if isinstance(value, date):
        return datetime.combine(value, time.min, tzinfo=timezone.utc)
    if isinstance(value, str):
        text = value.strip()
        if len(text) == 10:
            return datetime.combine(date.fromisoformat(text), time.min, tzinfo=timezone.utc)
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    return None


class TaskCreate(BaseModel):
    title: str = Field(min_length=3, max_length=500)
    description: str = Field(min_length=10)
    intake_channel: IntakeChannel = IntakeChannel.form
    department_id: UUID | None = None
    priority: TaskPriority | None = None
    assignee_id: UUID | None = None
    deadline: datetime | None = None
    effort_points: int = Field(default=1, ge=1, le=100)

    @field_validator("deadline", mode="before")
    @classmethod
    def parse_deadline(cls, value: datetime | date | str | None) -> datetime | None:
        return _normalize_deadline(value)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=500)
    description: str | None = Field(default=None, min_length=10)
    deadline: datetime | None = None
    effort_points: int | None = Field(default=None, ge=1, le=100)
    priority: TaskPriority | None = None
    status: TaskStatus | None = None

    @field_validator("deadline", mode="before")
    @classmethod
    def parse_deadline(cls, value: datetime | date | str | None) -> datetime | None:
        return _normalize_deadline(value)


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskAssigneeUpdate(BaseModel):
    assignee_id: UUID


class TaskRead(BaseModel):
    id: UUID
    title: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    priority_manual: bool = False
    intake_channel: IntakeChannel
    effort_points: int
    department_id: UUID
    created_by_id: UUID
    assigned_to_id: UUID | None
    auto_routed: bool
    routing_note: str | None = None
    deadline: datetime | None
    created_at: datetime
    updated_at: datetime
    assigned_to: UserBrief | None = None
    classification: ClassificationRead | None = None
    routing: RoutingRead | None = None

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    items: list[TaskRead]
    page: int
    page_size: int
    total: int


class CommentCreate(BaseModel):
    body: str = Field(min_length=1)


class CommentRead(BaseModel):
    id: UUID
    body: str
    user_id: UUID
    author_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BulkTaskRequest(BaseModel):
    task_ids: list[UUID] = Field(min_length=1)
    action: str = Field(pattern="^(delete|status|assign)$")
    status: TaskStatus | None = None
    assignee_id: UUID | None = None


class BulkTaskResult(BaseModel):
    succeeded: list[UUID]
    failed: list[UUID]


class CompletedOverTimePoint(BaseModel):
    date: str
    count: int


class HeatmapUserEntry(BaseModel):
    user_id: UUID
    full_name: str
    department_id: UUID
    department_name: str
    role: UserRole
    is_active: bool
    active_task_count: int
    effort_sum: int
    max_active_tasks: int
    load_percent: float


class WorkloadUserEntry(BaseModel):
    user_id: UUID
    full_name: str
    active_task_count: int
    effort_sum: int
    max_active_tasks: int


class WorkloadResponse(BaseModel):
    department_id: UUID | None
    computed_at: datetime
    users: list[WorkloadUserEntry]
