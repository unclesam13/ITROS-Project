import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { Link } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import CategoryBadge from "../components/CategoryBadge";
import DueDate from "../components/DueDate";
import PriorityBadge from "../components/PriorityBadge";
import { api, type Task, type UserProfile } from "../api/client";
import { formatStatus } from "../utils/formatters";
import { canDeleteTask } from "../utils/permissions";

const COLUMNS = ["open", "assigned", "in_progress", "completed"] as const;

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
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
      className={`rounded-lg border border-surface-border bg-surface-card p-3 shadow-card transition-shadow hover:border-slate-600 ${isDragging ? "opacity-60" : ""}`}
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <Link
          to={`/tasks/${task.id}`}
          className="font-medium text-slate-100 hover:text-accent-bright"
          onClick={(e) => e.stopPropagation()}
        >
          {task.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {task.classification && <CategoryBadge category={task.classification.category} />}
          <PriorityBadge priority={task.priority} showIcon />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-slate-600">{task.id.slice(0, 8)}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/25 text-[10px] font-semibold text-accent-bright">
            {initials(task.assigned_to?.full_name)}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          <DueDate deadline={task.deadline} status={task.status} />
        </div>
      </div>
      <div className="mt-2 flex gap-2 border-t border-surface-border pt-2">
        {task.status !== "completed" && (
          <button type="button" onClick={() => onDone(task)} className="text-xs text-chart-green hover:underline">
            Done
          </button>
        )}
        {showDelete && (
          <button type="button" onClick={() => onDelete(task)} className="text-xs text-red-400 hover:underline">
            Delete
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
      className={`flex min-h-[480px] w-72 flex-shrink-0 flex-col rounded-xl border p-3 ${
        isOver ? "border-accent bg-accent/5" : "border-surface-border bg-surface-elevated/50"
      }`}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label} <span className="text-slate-600">({tasks.length})</span>
      </h3>
      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <KanbanCard key={t.id} task={t} onDone={onDone} onDelete={onDelete} showDelete={canDelete(t)} />
        ))}
      </div>
    </div>
  );
}

function InsightsPanel({ tasks }: { tasks: Task[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    COLUMNS.forEach((col) => { c[col] = tasks.filter((t) => t.status === col).length; });
    return c;
  }, [tasks]);
  const total = tasks.length || 1;

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col gap-4 xl:flex">
      <div className="card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sprint scope</h3>
        <p className="mt-2 text-2xl font-bold text-slate-100">{tasks.length}</p>
        <p className="text-xs text-slate-500">tasks on board</p>
        <div className="mt-4 space-y-3">
          {COLUMNS.map((col) => {
            const pct = Math.round((counts[col] / total) * 100);
            const colors: Record<string, string> = {
              open: "bg-slate-500",
              assigned: "bg-chart-blue",
              in_progress: "bg-chart-orange",
              completed: "bg-chart-green",
            };
            return (
              <div key={col}>
                <div className="mb-1 flex justify-between text-xs text-slate-400">
                  <span>{formatStatus(col)}</span>
                  <span>{counts[col]} ({pct}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-elevated">
                  <div className={`h-1.5 rounded-full ${colors[col]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
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
      <div className="flex gap-4">
        <DndContext onDragEnd={onDragEnd}>
          <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
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
        <InsightsPanel tasks={tasks} />
      </div>
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
