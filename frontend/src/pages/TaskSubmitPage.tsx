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

      <h1 className="mb-2 text-2xl font-bold text-slate-900">Submit task</h1>

      <p className="mb-6 text-sm text-slate-500">

        {assigneeId ? "Task will be assigned directly to the selected user." : "Task will be NLP-classified and auto-routed."}

      </p>

      <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

        <div>

          <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>

          <input

            value={title}

            onChange={(e) => setTitle(e.target.value)}

            required

            minLength={3}

            className="w-full rounded-lg border border-slate-200 px-3 py-2"

          />

        </div>

        <div>

          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>

          <textarea

            value={description}

            onChange={(e) => setDescription(e.target.value)}

            required

            minLength={10}

            rows={5}

            className="w-full rounded-lg border border-slate-200 px-3 py-2"

          />

        </div>

        <div>

          <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>

          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2">

            {PRIORITIES.map((p) => (

              <option key={p.value} value={p.value}>{p.label}</option>

            ))}

          </select>

        </div>

        <div>

          <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>

          <input

            type="date"

            value={deadline}

            onChange={(e) => setDeadline(e.target.value)}

            className="w-full rounded-lg border border-slate-200 px-3 py-2"

          />

        </div>

        <div>

          <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>

          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2">

            {departments.map((d) => (

              <option key={d.id} value={d.id}>{d.name}</option>

            ))}

          </select>

        </div>

        {isManagerOrAdmin && (

          <div>

            <label className="mb-1 block text-sm font-medium text-slate-700">Assign to (optional)</label>

            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2">

              <option value="">Auto-route to best fit</option>

              {users.map((u) => (

                <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>

              ))}

            </select>

          </div>

        )}

        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">

          {assigneeId ? "Submit & assign" : "Submit & auto-route"}

        </button>

      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

    </AppLayout>

  );

}


