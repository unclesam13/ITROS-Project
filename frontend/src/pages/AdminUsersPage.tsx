import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../auth/AuthContext";
import { api, type UserRecord } from "../api/client";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "itros123",
    full_name: "",
    role: "employee",
    department_id: "",
    max_active_tasks: 10,
  });
  const [editForm, setEditForm] = useState({ role: "", department_id: "", max_active_tasks: 10 });

  const load = () => api.listUsers().then(setUsers);

  useEffect(() => {
    load();
    api.departments().then((d) => {
      setDepartments(d);
      if (d[0]) setForm((f) => ({ ...f, department_id: d[0].id }));
    });
  }, []);

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    await api.createUser(form);
    setShowAdd(false);
    load();
  };

  const onSaveEdit = async () => {
    if (!editId) return;
    await api.updateUser(editId, editForm);
    setEditId(null);
    load();
  };

  const onDeactivate = async () => {
    if (!deactivateId) return;
    await api.deactivateUser(deactivateId);
    setDeactivateId(null);
    load();
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">User management</h1>
        <button onClick={() => setShowAdd(true)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white">
          + Add user
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Department</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.full_name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">{departments.find((d) => d.id === u.department_id)?.name ?? u.department_id.slice(0, 8)}</td>
                <td className="p-3">{u.is_active ? "Active" : "Inactive"}</td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => {
                      setEditId(u.id);
                      setEditForm({ role: u.role, department_id: u.department_id, max_active_tasks: u.max_active_tasks });
                    }}
                    className="text-brand-600 hover:underline"
                  >
                    Edit
                  </button>
                  {u.is_active && (
                    <button onClick={() => setDeactivateId(u.id)} className="text-red-600 hover:underline">
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={onAdd} className="w-full max-w-md rounded-xl bg-white p-6 space-y-3">
            <h3 className="font-semibold">Add user</h3>
            <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded border px-3 py-2" required />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded border px-3 py-2" required />
            <input placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded border px-3 py-2" required />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded border px-3 py-2">
              {["employee", "manager", "admin"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="w-full rounded border px-3 py-2">
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="rounded border px-3 py-1.5">Cancel</button>
              <button type="submit" className="rounded bg-brand-600 px-3 py-1.5 text-white">Create</button>
            </div>
          </form>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 space-y-3">
            <h3 className="font-semibold">Edit user</h3>
            <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full rounded border px-3 py-2">
              {["employee", "manager", "admin"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={editForm.department_id} onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })} className="w-full rounded border px-3 py-2">
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input type="number" value={editForm.max_active_tasks} onChange={(e) => setEditForm({ ...editForm, max_active_tasks: Number(e.target.value) })} className="w-full rounded border px-3 py-2" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditId(null)} className="rounded border px-3 py-1.5">Cancel</button>
              <button onClick={onSaveEdit} className="rounded bg-brand-600 px-3 py-1.5 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deactivateId}
        title="Deactivate user?"
        message="User will no longer be able to log in."
        confirmLabel="Deactivate"
        danger
        onConfirm={onDeactivate}
        onCancel={() => setDeactivateId(null)}
      />
    </AppLayout>
  );
}
