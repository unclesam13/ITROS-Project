import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { api } from "../api/client";

export default function TaskSubmitPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState("manual");
  const [departmentId, setDepartmentId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.departments().then((d) => {
      setDepartments(d);
      if (d[0]) setDepartmentId(d[0].id);
    });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const task = await api.createTask({
        title,
        description,
        intake_channel: channel,
        department_id: departmentId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold">Submit task</h1>
      <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-lg border px-3 py-2" />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} className="w-full rounded-lg border px-3 py-2" />
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full rounded-lg border px-3 py-2">
          {["manual", "form", "email", "internal"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full rounded-lg border px-3 py-2">
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700">Submit & auto-route</button>
      </form>
      {error && <p className="mt-3 text-red-600">{error}</p>}
    </AppLayout>
  );
}
