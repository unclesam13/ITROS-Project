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
  admin: "bg-purple-500/20 text-purple-300",
  manager: "bg-chart-blue/20 text-chart-blue",
  employee: "bg-slate-500/20 text-slate-400",
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
    <span className="inline-flex items-center gap-1.5 text-slate-400">
      <span className={`inline-block h-2 w-2 rounded-full ${active ? "bg-chart-green" : "bg-slate-600"}`} />
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
      <h1 className="page-title">Workload heatmap</h1>
      <p className="page-subtitle mb-6">Organization-wide employee load distribution</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="table-head">
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
                <tr key={r.user_id} className="table-row">
                  <td className="p-3 font-medium text-slate-200">{r.full_name}</td>
                  <td className="p-3 text-slate-400">{r.department_name}</td>
                  <td className="p-3"><RoleBadge role={r.role} /></td>
                  <td className="p-3"><AccountStatus active={r.is_active} /></td>
                  <td className="p-3 text-slate-300">{r.active_task_count}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-32 rounded-full bg-surface-elevated">
                        <div
                          className={`h-3 rounded-full ${loadBarColor(loadPct)}`}
                          style={{ width: `${Math.min(loadPct, 100)}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-slate-400">{loadPct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-center text-slate-600">No users found.</p>
        )}
      </div>
    </AppLayout>
  );
}
