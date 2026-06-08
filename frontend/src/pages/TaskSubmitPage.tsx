import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../auth/AuthContext";
import { api, type UserRecord } from "../api/client";

const PRIORITY_AUTO = "auto";

const PRIORITIES = [
  { value: PRIORITY_AUTO, label: "Auto-detect" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export default function TaskSubmitPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>(PRIORITY_AUTO);
  const [departmentId, setDepartmentId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [error, setError] = useState("");

  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";
  const autoRoute = !assigneeId;

  useEffect(() => {
    api.departments().then((d) => {
      setDepartments(d);
      if (d[0]) setDepartmentId(d[0].id);
    });
    if (isManagerOrAdmin) {
      api.listUsers().then((list) => setUsers(list.filter((u) => u.is_active)));
    }
  }, [isManagerOrAdmin]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const task = await api.createTask({
        title,
        description,
        department_id: departmentId || undefined,
        deadline: deadline || undefined,
        assignee_id: assigneeId || undefined,
        ...(priority !== PRIORITY_AUTO ? { priority } : {}),
      });
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 border-b border-surface-border pb-5">
        <h1 className="page-title">Submit task</h1>
        <p className="page-subtitle mt-1">
          {autoRoute
            ? "Describe the work — ITROS will classify priority and route to the best available teammate."
            : "This task will skip auto-routing and go directly to your selected assignee."}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5 lg:gap-6">
        <form onSubmit={onSubmit} className="card space-y-6 p-5 sm:p-6 lg:col-span-3">
          <section>
            <h2 className="form-section-title">Task details</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={3}
                  placeholder="Brief summary of the request"
                  className="input"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={10}
                  rows={6}
                  placeholder="Include context, deadlines, and any relevant details for routing…"
                  className="input resize-y"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="form-section-title">Scheduling &amp; routing</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="select w-full">
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Due date</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Department</label>
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="select w-full">
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              {isManagerOrAdmin && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Assign to (optional)</label>
                  <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="select w-full">
                    <option value="">Auto-route to best fit</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-surface-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {autoRoute ? "NLP classification runs on submit." : "Manual assignment — no auto-routing."}
            </p>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              {autoRoute ? "Submit & auto-route" : "Submit & assign"}
            </button>
          </div>
        </form>

        <aside className="space-y-4 lg:col-span-2">
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">How auto-routing works</h3>
            <ol className="space-y-3 text-sm text-slate-400">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent-bright">1</span>
                <span>NLP analyzes your title and description to detect category and priority.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent-bright">2</span>
                <span>Eligible teammates in the matching department are scored by skill fit and current load.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent-bright">3</span>
                <span>The best match is assigned automatically. You can review routing on the task detail page.</span>
              </li>
            </ol>
          </div>

          <div className="card border-accent/20 bg-accent/5 p-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Tips for better routing</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>· Mention urgency words like &quot;urgent&quot; or &quot;ASAP&quot; if time-sensitive.</li>
              <li>· Include the department or system affected (billing, IT, HR, etc.).</li>
              <li>· Managers can override routing by picking an assignee above.</li>
            </ul>
          </div>
        </aside>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </AppLayout>
  );
}
