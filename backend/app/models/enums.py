import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    employee = "employee"


class TaskStatus(str, enum.Enum):
    open = "open"
    assigned = "assigned"
    in_progress = "in_progress"
    completed = "completed"


class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IntakeChannel(str, enum.Enum):
    manual = "manual"
    form = "form"
    email = "email"
    internal = "internal"


class RoutingStatus(str, enum.Enum):
    suggested = "suggested"
    applied = "applied"
    failed = "failed"
    overridden = "overridden"
