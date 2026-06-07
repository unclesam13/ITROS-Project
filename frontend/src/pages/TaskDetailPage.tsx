import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import ConfirmModal from "../components/ConfirmModal";
import DueDate from "../components/DueDate";
import PriorityBadge from "../components/PriorityBadge";
import { useAuth } from "../auth/AuthContext";
import { api, type Comment, type Task } from "../api/client";

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
        deadline: t.deadline ? t.deadline.slice(0, 16) : "",
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
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
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
    await api.cancelTask(id);
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
          <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>
          <p className="mt-1 text-sm text-slate-500 capitalize">
            {task.status.replace("_", " ")} · <PriorityBadge priority={task.priority} />
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={() => setEditing(!editing)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50">
              {editing ? "Cancel edit" : "Edit"}
            </button>
          )}
          <button onClick={() => setShowDelete(true)} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {editing ? (
            <form onSubmit={saveEdit} className="rounded-xl border bg-white p-5 space-y-4">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded border px-3 py-2" required />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className="w-full rounded border px-3 py-2" required />
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded border px-3 py-2">
                {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="rounded border px-3 py-2" />
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white">Save</button>
            </form>
          ) : (
            <div className="rounded-xl border bg-white p-5">
              <p className="whitespace-pre-wrap text-slate-700">{task.description}</p>
              <p className="mt-4 text-sm text-slate-500">
                Due: <DueDate deadline={task.deadline} status={task.status} />
              </p>
            </div>
          )}

          {task.classification && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-800">NLP Classification</h3>
              <p className="mt-1 text-sm">Category: {task.classification.category} ({(task.classification.confidence * 100).toFixed(0)}%)</p>
              <p className="text-sm text-slate-500">{task.classification.processing_time_ms} ms</p>
            </div>
          )}
          {task.routing && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <h3 className="font-semibold text-slate-800">Routing</h3>
              <p className="mt-1 text-sm">{task.routing.rationale_summary ?? task.routing.status}</p>
            </div>
          )}

          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold text-slate-800">Comments</h3>
            <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
              {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{c.author_name ?? "User"}</span>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-slate-800">{c.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={sendComment} className="mt-4 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white">Send</button>
            </form>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 text-sm space-y-3">
          <p><span className="text-slate-500">Assignee:</span> {task.assigned_to?.full_name ?? "Unassigned"}</p>
          <p><span className="text-slate-500">Channel:</span> {task.intake_channel}</p>
          <p><span className="text-slate-500">Created:</span> {new Date(task.created_at).toLocaleString()}</p>
        </div>
      </div>

      <ConfirmModal open={showDelete} title="Cancel task?" message="This will set the task to cancelled." confirmLabel="Cancel task" danger onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
    </AppLayout>
  );
}
