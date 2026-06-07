import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import ConfirmModal from "../components/ConfirmModal";
import DueDate from "../components/DueDate";
import PriorityBadge from "../components/PriorityBadge";
import TaskKanbanView from "./TaskKanbanView";
import { useAuth } from "../auth/AuthContext";
import { api, type Task, type TaskFilters, type UserRecord } from "../api/client";

export default function TaskListPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [search, setSearch] = useState("");
  const [bulkStatus, setBulkStatus] = useState("assigned");
  const [bulkAssignee, setBulkAssignee] = useState("");

  const load = useCallback(() => {
    api.listTasks({ ...filters, search: search || undefined }).then((r) => setTasks(r.items));
  }, [filters, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "manager") {
      api.listUsers().then(setUsers).catch(() => {});
    }
  }, [user]);

  const canBulk = user?.role === "admin" || user?.role === "manager";

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = async (action: string) => {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "cancel") {
      await api.bulkTasks({ task_ids: ids, action: "cancel" });
    } else if (action === "status") {
      await api.bulkTasks({ task_ids: ids, action: "status", status: bulkStatus });
    } else if (action === "assign" && bulkAssignee) {
      await api.bulkTasks({ task_ids: ids, action: "assign", assignee_id: bulkAssignee });
    }
    setSelected(new Set());
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.cancelTask(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView("list")}
            className={`rounded-lg px-3 py-1.5 text-sm ${view === "list" ? "bg-brand-600 text-white" : "border hover:bg-slate-50"}`}
          >
            List
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`rounded-lg px-3 py-1.5 text-sm ${view === "kanban" ? "bg-brand-600 text-white" : "border hover:bg-slate-50"}`}
          >
            Kanban
          </button>
          <Link to="/tasks/new" className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">
            + New
          </Link>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input
          placeholder="Search title/description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm lg:col-span-2"
        />
        <select
          value={filters.status ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {["open", "assigned", "in_progress", "completed", "cancelled"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filters.priority ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value || undefined }))}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All priorities</option>
          {["low", "medium", "high", "critical"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={filters.category ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined }))}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {["administrative", "finance", "technical", "support", "general"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {canBulk && (
          <select
            value={filters.assignee_id ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, assignee_id: e.target.value || undefined }))}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">All assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        )}
      </div>

      {view === "list" && canBulk && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            {selectMode ? "Cancel select" : "Select"}
          </button>
          {selectMode && selected.size > 0 && (
            <>
              <select value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} className="rounded border px-2 py-1 text-sm">
                <option value="">Assign to…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <button onClick={() => runBulk("assign")} className="text-sm text-brand-600 hover:underline">Apply assign</button>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="rounded border px-2 py-1 text-sm">
                {["open", "assigned", "in_progress", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => runBulk("status")} className="text-sm text-brand-600 hover:underline">Change status</button>
              <button onClick={() => runBulk("cancel")} className="text-sm text-red-600 hover:underline">Delete selected</button>
            </>
          )}
        </div>
      )}

      {view === "kanban" ? (
        <TaskKanbanView tasks={tasks} onRefresh={load} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                {selectMode && <th className="p-3 w-8" />}
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Due</th>
                <th className="p-3">Assignee</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {tasks.filter((t) => t.status !== "cancelled").map((t) => (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                  {selectMode && (
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />
                    </td>
                  )}
                  <td className="p-3">
                    <Link to={`/tasks/${t.id}`} className="font-medium text-brand-700 hover:underline">{t.title}</Link>
                  </td>
                  <td className="p-3 capitalize">{t.status.replace("_", " ")}</td>
                  <td className="p-3"><PriorityBadge priority={t.priority} /></td>
                  <td className="p-3"><DueDate deadline={t.deadline} status={t.status} /></td>
                  <td className="p-3">{t.assigned_to?.full_name ?? "—"}</td>
                  <td className="p-3">
                    <button onClick={() => setDeleteTarget(t)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 0 && <p className="p-6 text-center text-slate-400">No tasks match filters.</p>}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Cancel task?"
        message={`Cancel "${deleteTarget?.title}"?`}
        confirmLabel="Cancel task"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
