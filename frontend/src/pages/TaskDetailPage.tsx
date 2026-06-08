import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import ConfirmModal from "../components/ConfirmModal";
import DueDate from "../components/DueDate";
import PriorityBadge from "../components/PriorityBadge";
import { useAuth } from "../auth/AuthContext";
import { api, type Comment, type Task } from "../api/client";
import { formatChannel, formatStatus } from "../utils/formatters";
import { canDeleteTask } from "../utils/permissions";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [editing, setEditing] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "", deadline: "" });

  const load = () => {
    if (!id) return;
    api.getTask(id).then((t) => {
      setTask(t);
      setForm({
        title: t.title,
        description: t.description,
        priority: t.priority,
        deadline: t.deadline ? t.deadline.slice(0, 10) : "",
      });
    });
    api.listComments(id).then(setComments).catch(() => setComments([]));
  };

  useEffect(load, [id]);

  const canEdit = user?.role === "admin" || user?.role === "manager";

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    await api.updateTask(id, {
      title: form.title,
      description: form.description,
      priority: form.priority,
      deadline: form.deadline || null,
    });
    setEditing(false);
    load();
  };

  const sendComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !commentText.trim()) return;
    await api.addComment(id, commentText.trim());
    setCommentText("");
    load();
  };

  const handleDelete = async () => {
    if (!id) return;
    await api.deleteTask(id);
    navigate("/tasks");
  };

  if (!task) {
    return (
      <AppLayout>
        <p className="text-slate-500">Loading…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{task.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatStatus(task.status)} · <PriorityBadge priority={task.priority} />
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={() => setEditing(!editing)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-surface-hover">
              {editing ? "Cancel edit" : "Edit"}
            </button>
          )}
          {canDeleteTask(task, user) && (
            <button onClick={() => setShowDelete(true)} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10">
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {editing ? (
            <form onSubmit={saveEdit} className="card p-5 space-y-4">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" required />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className="input" required />
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="select">
                {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="input" />
              <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm text-white">Save</button>
            </form>
          ) : (
            <div className="card p-5">
              <p className="whitespace-pre-wrap text-slate-300">{task.description}</p>
              <p className="mt-4 text-sm text-slate-500">
                Due: <DueDate deadline={task.deadline} status={task.status} />
              </p>
            </div>
          )}

          {task.classification && (
            <div className="card border-surface-border bg-surface-elevated p-4">
              <h3 className="font-semibold text-slate-200">NLP Classification</h3>
              <p className="mt-1 text-sm">Category: {task.classification.category} ({(task.classification.confidence * 100).toFixed(0)}%)</p>
              <p className="text-sm">
                Priority: <span className="capitalize">{task.priority}</span>
              </p>
              <p className="text-sm text-slate-500">{task.classification.processing_time_ms} ms</p>
            </div>
          )}
          {task.routing && (
            <div className="card border-accent/30 bg-accent/10 p-4">
              <h3 className="font-semibold text-slate-200">Routing</h3>
              <p className="mt-1 text-sm">
                <span className="font-medium text-slate-300">{formatChannel(task.routing.status)}</span>
                {task.routing.rationale_summary ? (
                  <>
                    {" "}- {task.routing.rationale_summary}
                  </>
                ) : null}
              </p>
              {task.routing_note && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                  {task.routing_note}
                </div>
              )}
            </div>
          )}

          <div className="card p-5">
            <h3 className="font-semibold text-slate-200">Comments</h3>
            <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
              {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-surface-elevated p-3 text-sm">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-300">{c.author_name ?? "User"}</span>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-slate-200">{c.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={sendComment} className="mt-4 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                className="input flex-1"
              />
              <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm text-white">Send</button>
            </form>
          </div>
        </div>

        <div className="card p-5 text-sm space-y-3">
          <p><span className="text-slate-500">Assignee:</span> {task.assigned_to?.full_name ?? "Unassigned"}</p>
          <p><span className="text-slate-500">Channel:</span> {formatChannel(task.intake_channel)}</p>
          <p><span className="text-slate-500">Created:</span> {new Date(task.created_at).toLocaleString()}</p>
        </div>
      </div>

      <ConfirmModal open={showDelete} title="Delete task?" message="Permanently delete this task? This cannot be undone." confirmLabel="Delete" danger onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
    </AppLayout>
  );
}
