import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../auth/AuthContext";
import { api, type HeatmapEntry } from "../api/client";

function loadBarColor(pct: number): string {
  const value = Number(pct);
  if (value >= 70) return "bg-red-500";
  if (value >= 40) return "bg-amber-400";
  return "bg-green-500";
}

const ROLE_STYLES: Record<HeatmapEntry["role"], string> = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  employee: "bg-slate-100 text-slate-700",
};

function RoleBadge({ role }: { role: HeatmapEntry["role"] }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[role]}`}>
      {role}
    </span>
  );
}

function AccountStatus({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-700">
      <span className={`inline-block h-2 w-2 rounded-full ${active ? "bg-green-500" : "bg-slate-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function AdminHeatmapPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HeatmapEntry[]>([]);

  useEffect(() => {
    api.heatmap()
      .then((data) => setRows([...data].sort((a, b) => b.load_percent - a.load_percent)))
      .catch(() => {});
  }, []);

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <h1 className="mb-2 text-2xl font-bold">Workload heatmap</h1>
      <p className="mb-6 text-sm text-slate-500">Organization-wide employee load distribution</p>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Department</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Active Tasks</th>
              <th className="p-3">Load</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const loadPct = Number(r.load_percent);
              return (
                <tr key={r.user_id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{r.full_name}</td>
                  <td className="p-3">{r.department_name}</td>
                  <td className="p-3">
                    <RoleBadge role={r.role} />
                  </td>
                  <td className="p-3">
                    <AccountStatus active={r.is_active} />
                  </td>
                  <td className="p-3">{r.active_task_count}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-32 rounded-full bg-slate-100">
                        <div
                          className={`h-3 rounded-full ${loadBarColor(loadPct)}`}
                          style={{ width: `${Math.min(loadPct, 100)}%` }}
                        />
                      </div>
                      <span className="tabular-nums">{loadPct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-center text-slate-400">No users found.</p>
        )}
      </div>
    </AppLayout>
  );
}
