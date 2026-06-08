import { useCallback, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import AppLayout from "../components/AppLayout";

import ConfirmModal from "../components/ConfirmModal";

import DueDate from "../components/DueDate";

import PriorityBadge from "../components/PriorityBadge";

import TaskKanbanView from "./TaskKanbanView";

import { useAuth } from "../auth/AuthContext";

import { api, type Task, type TaskFilters, type UserRecord } from "../api/client";

import { formatStatus } from "../utils/formatters";

import {

  canChangeTaskAssignee,

  canChangeTaskDueDate,

  canChangeTaskPriority,

  canChangeTaskStatus,

  canDeleteTask,

  validNextStatuses,

} from "../utils/permissions";



const PRIORITIES = ["critical", "high", "medium", "low"] as const;



function deadlineToInput(deadline?: string | null): string {

  if (!deadline) return "";

  return deadline.slice(0, 10);

}



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

  const [savingId, setSavingId] = useState<string | null>(null);



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

  const activeUsers = users.filter((u) => u.is_active);



  const patchTask = (updated: Task) => {

    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

  };



  const handleStatusChange = async (task: Task, status: string) => {

    if (status === task.status) return;

    setSavingId(task.id);

    try {

      const updated = await api.updateTask(task.id, { status });

      patchTask(updated);

    } catch {

      load();

    } finally {

      setSavingId(null);

    }

  };



  const handlePriorityChange = async (task: Task, priority: string) => {

    if (priority === task.priority) return;

    setSavingId(task.id);

    try {

      const updated = await api.updateTask(task.id, { priority });

      patchTask(updated);

    } catch {

      load();

    } finally {

      setSavingId(null);

    }

  };



  const handleAssigneeChange = async (task: Task, assigneeId: string) => {

    if (!assigneeId || assigneeId === task.assigned_to?.id) return;

    setSavingId(task.id);

    try {

      const updated = await api.updateAssignee(task.id, assigneeId);

      patchTask(updated);

    } catch {

      load();

    } finally {

      setSavingId(null);

    }

  };



  const handleDueDateChange = async (task: Task, value: string) => {

    const current = deadlineToInput(task.deadline);

    if (value === current) return;

    setSavingId(task.id);

    try {

      const updated = await api.updateTask(task.id, { deadline: value || null });

      patchTask(updated);

    } catch {

      load();

    } finally {

      setSavingId(null);

    }

  };



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

    if (action === "delete") {

      await api.bulkTasks({ task_ids: ids, action: "delete" });

    } else if (action === "status") {

      await api.bulkTasks({ task_ids: ids, action: "status", status: bulkStatus });

    } else if (action === "assign" && bulkAssignee) {

      await api.bulkTasks({ task_ids: ids, action: "assign", assignee_id: bulkAssignee });

    }

    setSelected(new Set());

    if (action === "delete") {

      setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));

    } else {

      load();

    }

  };



  const handleDelete = async () => {

    if (!deleteTarget) return;

    const deletedId = deleteTarget.id;

    await api.deleteTask(deletedId);

    setDeleteTarget(null);

    setTasks((prev) => prev.filter((t) => t.id !== deletedId));

  };



  return (

    <AppLayout>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

        <h1 className="page-title">Tasks</h1>

        <div className="flex gap-2">

          <button

            onClick={() => setView("list")}

            className={view === "list" ? "btn-primary py-1.5" : "btn-secondary py-1.5"}

          >

            List

          </button>

          <button

            onClick={() => setView("kanban")}

            className={view === "kanban" ? "btn-primary py-1.5" : "btn-secondary py-1.5"}

          >

            Kanban

          </button>

          <Link to="/tasks/new" className="btn-primary py-1.5">

            + New

          </Link>

        </div>

      </div>



      <div className="mb-4 grid gap-3 rounded-xl border border-surface-border bg-surface-card p-4 sm:grid-cols-2 lg:grid-cols-6">

        <input

          placeholder="Search title/description…"

          value={search}

          onChange={(e) => setSearch(e.target.value)}

          className="input lg:col-span-2"

        />

        <select

          value={filters.status ?? ""}

          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}

          className="select w-full"

        >

          <option value="">All statuses</option>

          {["open", "assigned", "in_progress", "completed"].map((s) => (

            <option key={s} value={s}>{formatStatus(s)}</option>

          ))}

        </select>

        <select

          value={filters.priority ?? ""}

          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value || undefined }))}

          className="select w-full"

        >

          <option value="">All priorities</option>

          {PRIORITIES.map((p) => (

            <option key={p} value={p}>{p}</option>

          ))}

        </select>

        <select

          value={filters.category ?? ""}

          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined }))}

          className="select w-full"

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

            className="select w-full"

          >

            <option value="">All assignees</option>

            {activeUsers.map((u) => (

              <option key={u.id} value={u.id}>{u.full_name}</option>

            ))}

          </select>

        )}

      </div>



      {view === "list" && canBulk && (

        <div className="mb-4 flex flex-wrap items-center gap-3">

          <button

            onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}

            className="btn-secondary py-1.5"

          >

            {selectMode ? "Cancel select" : "Select"}

          </button>

          {selectMode && selected.size > 0 && (

            <>

              <select value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} className="input-inline">

                <option value="">Assign to…</option>

                {activeUsers.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}

              </select>

              <button onClick={() => runBulk("assign")} className="text-sm text-accent-bright hover:underline">Apply assign</button>

              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="input-inline">

                {["open", "assigned", "in_progress", "completed"].map((s) => (

                  <option key={s} value={s}>{formatStatus(s)}</option>

                ))}

              </select>

              <button onClick={() => runBulk("status")} className="text-sm text-accent-bright hover:underline">Change status</button>

              <button onClick={() => runBulk("delete")} className="text-sm text-red-400 hover:underline">Delete selected</button>

            </>

          )}

        </div>

      )}



      {view === "kanban" ? (

        <TaskKanbanView

          tasks={tasks}

          onRefresh={load}

          onTaskDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}

          user={user}

        />

      ) : (

        <div className="card overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="table-head">

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

              {tasks.map((t) => {

                const rowBusy = savingId === t.id;

                const statusEditable = canChangeTaskStatus(t, user) && validNextStatuses(t.status).length > 1;

                const priorityEditable = canChangeTaskPriority(t, user);

                const assigneeEditable = canChangeTaskAssignee(user);

                const dueEditable = canChangeTaskDueDate(t, user);



                return (

                  <tr key={t.id} className={`border-t border-surface-border hover:bg-surface-hover ${rowBusy ? "opacity-60" : ""}`}>

                    {selectMode && (

                      <td className="p-3">

                        <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />

                      </td>

                    )}

                    <td className="p-3">

                      <Link to={`/tasks/${t.id}`} className="font-medium text-accent-bright hover:underline">{t.title}</Link>

                    </td>

                    <td className="p-3">

                      {statusEditable ? (

                        <select

                          value={t.status}

                          disabled={rowBusy}

                          onChange={(e) => void handleStatusChange(t, e.target.value)}

                          className="input-inline"

                        >

                          {validNextStatuses(t.status).map((s) => (

                            <option key={s} value={s}>{formatStatus(s)}</option>

                          ))}

                        </select>

                      ) : (

                        <span>{formatStatus(t.status)}</span>

                      )}

                    </td>

                    <td className="p-3">

                      {priorityEditable ? (

                        <select

                          value={t.priority}

                          disabled={rowBusy}

                          onChange={(e) => void handlePriorityChange(t, e.target.value)}

                          className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium capitalize cursor-pointer ${

                            t.priority === "critical" ? "bg-red-500/20 text-red-300"

                            : t.priority === "high" ? "bg-amber-500/20 text-amber-300"

                            : t.priority === "low" ? "bg-slate-500/20 text-slate-400"

                            : "bg-blue-500/20 text-blue-300"

                          }`}

                        >

                          {PRIORITIES.map((p) => (

                            <option key={p} value={p}>{p}</option>

                          ))}

                        </select>

                      ) : (

                        <PriorityBadge priority={t.priority} />

                      )}

                    </td>

                    <td className="p-3">

                      {dueEditable ? (

                        <input

                          type="date"

                          value={deadlineToInput(t.deadline)}

                          disabled={rowBusy}

                          onChange={(e) => void handleDueDateChange(t, e.target.value)}

                          className="input-date"

                        />

                      ) : (

                        <DueDate deadline={t.deadline} status={t.status} />

                      )}

                    </td>

                    <td className="p-3">

                      {assigneeEditable ? (

                        <select

                          value={t.assigned_to?.id ?? ""}

                          disabled={rowBusy}

                          onChange={(e) => void handleAssigneeChange(t, e.target.value)}

                          className="input-inline max-w-[10rem]"

                        >

                          <option value="">-</option>

                          {activeUsers.map((u) => (

                            <option key={u.id} value={u.id}>{u.full_name}</option>

                          ))}

                        </select>

                      ) : (

                        t.assigned_to?.full_name ?? "-"

                      )}

                    </td>

                    <td className="p-3">

                      {canDeleteTask(t, user) && (

                        <button onClick={() => setDeleteTarget(t)} className="text-red-400 hover:underline">

                          Delete

                        </button>

                      )}

                    </td>

                  </tr>

                );

              })}

            </tbody>

          </table>

          {tasks.length === 0 && <p className="p-6 text-center text-slate-400">No tasks match filters.</p>}

        </div>

      )}



      <ConfirmModal

        open={!!deleteTarget}

        title="Delete task?"

        message={`Permanently delete "${deleteTarget?.title}"? This cannot be undone.`}

        confirmLabel="Delete"

        danger

        onConfirm={handleDelete}

        onCancel={() => setDeleteTarget(null)}

      />

    </AppLayout>

  );

}


