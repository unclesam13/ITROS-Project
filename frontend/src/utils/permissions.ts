import type { Task, UserProfile } from "../api/client";

export function canDeleteTask(task: Pick<Task, "created_by_id" | "status">, user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  if (user.role === "employee") {
    return task.created_by_id === user.id && task.status === "open";
  }
  return false;
}

export function canChangeTaskStatus(task: Pick<Task, "assigned_to">, user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  return task.assigned_to?.id === user.id;
}

export function canChangeTaskPriority(task: Pick<Task, "created_by_id">, user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  return task.created_by_id === user.id;
}

export function canChangeTaskAssignee(user: UserProfile | null): boolean {
  return user?.role === "admin" || user?.role === "manager";
}

export function canChangeTaskDueDate(task: Pick<Task, "created_by_id">, user: UserProfile | null): boolean {
  return canChangeTaskPriority(task, user);
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["open", "assigned", "in_progress"],
  assigned: ["assigned", "in_progress"],
  in_progress: ["in_progress", "completed"],
  completed: ["completed"],
};

export function validNextStatuses(status: string): string[] {
  return STATUS_TRANSITIONS[status] ?? [status];
}
