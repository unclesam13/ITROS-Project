import { useState } from "react";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { Link } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import DueDate from "../components/DueDate";
import PriorityBadge from "../components/PriorityBadge";
import { api, type Task, type UserProfile } from "../api/client";
import { formatStatus } from "../utils/formatters";
import { canDeleteTask } from "../utils/permissions";

const COLUMNS = ["open", "assigned", "in_progress", "completed"] as const;

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function KanbanCard({
  task,
  onDone,
  onDelete,
  showDelete,
}: {
  task: Task;
  onDone: (t: Task) => void;
  onDelete: (t: Task) => void;
  showDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${isDragging ? "opacity-60" : ""}`}
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <Link to={`/tasks/${task.id}`} className="font-medium text-slate-900 hover:text-brand-600" onClick={(e) => e.stopPropagation()}>
          {task.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {task.classification && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{task.classification.category}</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700">
            {initials(task.assigned_to?.full_name)}
          </span>
          <DueDate deadline={task.deadline} status={task.status} />
        </div>
      </div>
      <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
        {task.status !== "completed" && (
          <button type="button" onClick={() => onDone(task)} className="text-xs text-green-700 hover:underline">
            ✓ Done
          </button>
        )}
        {showDelete && (
          <button type="button" onClick={() => onDelete(task)} className="text-xs text-red-600 hover:underline">
            🗑 Delete
          </button>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  id,
  label,
  tasks,
  onDone,
  onDelete,
  canDelete,
}: {
  id: string;
  label: string;
  tasks: Task[];
  onDone: (t: Task) => void;
  onDelete: (t: Task) => void;
  canDelete: (t: Task) => boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[400px] w-72 flex-shrink-0 flex-col rounded-xl border bg-slate-100/80 p-3 ${
        isOver ? "border-brand-400 bg-brand-50" : "border-slate-200"
      }`}
    >
      <h3 className="mb-3 font-semibold text-slate-700">
        {label} <span className="text-slate-400">({tasks.length})</span>
      </h3>
      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <KanbanCard key={t.id} task={t} onDone={onDone} onDelete={onDelete} showDelete={canDelete(t)} />
        ))}
      </div>
    </div>
  );
}

export default function TaskKanbanView({
  tasks,
  onRefresh,
  onTaskDeleted,
  user,
}: {
  tasks: Task[];
  onRefresh: () => void;
  onTaskDeleted: (id: string) => void;
  user: UserProfile | null;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const column = COLUMNS.find((c) => c === over.id);
    if (!column) return;
    try {
      await api.updateTaskStatus(String(active.id), column);
      onRefresh();
    } catch {
      /* invalid transition */
    }
  };

  const handleDone = async (task: Task) => {
    await api.updateTaskStatus(task.id, "completed");
    onRefresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    await api.deleteTask(deletedId);
    setDeleteTarget(null);
    onTaskDeleted(deletedId);
  };

  return (
    <>
      <DndContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col}
              id={col}
              label={formatStatus(col)}
              tasks={tasks.filter((t) => t.status === col)}
              onDone={handleDone}
              onDelete={setDeleteTarget}
              canDelete={(t) => canDeleteTask(t, user)}
            />
          ))}
        </div>
      </DndContext>
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete task?"
        message={`Permanently delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
