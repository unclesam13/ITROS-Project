import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../auth/AuthContext";
import { api, type UserRecord } from "../api/client";

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function joinName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className={labelClass}>{children}</label>;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UserRecord | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "itros123",
    role: "employee",
    department_id: "",
    max_active_tasks: 10,
  });
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    role: "",
    department_id: "",
    max_active_tasks: 10,
  });

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
    await api.createUser({
      email: form.email,
      password: form.password,
      full_name: joinName(form.firstName, form.lastName),
      role: form.role,
      department_id: form.department_id,
      max_active_tasks: form.max_active_tasks,
    });
    setShowAdd(false);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "itros123",
      role: "employee",
      department_id: departments[0]?.id ?? "",
      max_active_tasks: 10,
    });
    load();
  };

  const onSaveEdit = async () => {
    if (!editId) return;
    await api.updateUser(editId, {
      full_name: joinName(editForm.firstName, editForm.lastName),
      role: editForm.role,
      department_id: editForm.department_id,
      max_active_tasks: editForm.max_active_tasks,
    });
    setEditId(null);
    load();
  };

  const onDeactivate = async () => {
    if (!deactivateTarget) return;
    await api.deactivateUser(deactivateTarget.id);
    setDeactivateTarget(null);
    load();
  };

  const openEdit = (u: UserRecord) => {
    const { firstName, lastName } = splitName(u.full_name);
    setEditId(u.id);
    setEditForm({
      firstName,
      lastName,
      role: u.role,
      department_id: u.department_id,
      max_active_tasks: u.max_active_tasks,
    });
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
              <th className="p-3">Account Status</th>
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
                  <button onClick={() => openEdit(u)} className="text-brand-600 hover:underline">
                    Edit
                  </button>
                  {u.is_active && (
                    <button onClick={() => setDeactivateTarget(u)} className="text-red-600 hover:underline">
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
          <form onSubmit={onAdd} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">Add user</h3>

            <div>
              <p className={labelClass}>Full Name</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="add-first-name">First Name</FieldLabel>
                  <input
                    id="add-first-name"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="add-last-name">Last Name</FieldLabel>
                  <input
                    id="add-last-name"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="add-email">Email Address</FieldLabel>
              <input
                id="add-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                required
              />
            </div>

            <div>
              <FieldLabel htmlFor="add-role">Role</FieldLabel>
              <select
                id="add-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputClass}
              >
                {["employee", "manager", "admin"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Admin – full access, Manager – team oversight, Employee – task execution
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="add-department">Department / Team</FieldLabel>
              <select
                id="add-department"
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                className={inputClass}
                required
              >
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="add-capacity">Capacity</FieldLabel>
              <input
                id="add-capacity"
                type="number"
                min={1}
                value={form.max_active_tasks}
                onChange={(e) => setForm({ ...form, max_active_tasks: Number(e.target.value) })}
                className={inputClass}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Maximum effort points this user can handle simultaneously. Default is 10.
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="add-password">Password</FieldLabel>
              <input
                id="add-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border px-3 py-1.5 text-sm">Cancel</button>
              <button type="submit" className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white">Create</button>
            </div>
          </form>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">Edit user</h3>

            <div>
              <p className={labelClass}>Full Name</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="edit-first-name">First Name</FieldLabel>
                  <input
                    id="edit-first-name"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="edit-last-name">Last Name</FieldLabel>
                  <input
                    id="edit-last-name"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="edit-role">Role</FieldLabel>
              <select
                id="edit-role"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className={inputClass}
              >
                {["employee", "manager", "admin"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Admin – full access, Manager – team oversight, Employee – task execution
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="edit-department">Department / Team</FieldLabel>
              <select
                id="edit-department"
                value={editForm.department_id}
                onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                className={inputClass}
              >
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="edit-capacity">Capacity</FieldLabel>
              <input
                id="edit-capacity"
                type="number"
                min={1}
                value={editForm.max_active_tasks}
                onChange={(e) => setEditForm({ ...editForm, max_active_tasks: Number(e.target.value) })}
                className={inputClass}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Maximum effort points this user can handle simultaneously. Default is 10.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditId(null)} className="rounded-lg border px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={onSaveEdit} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deactivateTarget}
        title={`Deactivate ${deactivateTarget?.full_name ?? "user"}?`}
        message="They will lose access to the system. Their assigned tasks will remain."
        confirmLabel="Deactivate"
        danger
        onConfirm={onDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </AppLayout>
  );
}
