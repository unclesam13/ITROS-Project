import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../auth/AuthContext";
import { api, type WorkloadResponse } from "../api/client";

function loadBarColor(pct: number): string {
  if (pct >= 70) return "bg-red-500";
  if (pct >= 40) return "bg-amber-400";
  return "bg-green-500";
}

export default function WorkloadPage() {
  const { user } = useAuth();
  const isEmployee = user?.role === "employee";
  const [data, setData] = useState<WorkloadResponse | null>(null);

  useEffect(() => {
    api.workload().then(setData);
  }, []);

  return (
    <AppLayout>
      <h1 className="page-title">{isEmployee ? "Your workload" : "Team workload"}</h1>
      {isEmployee ? (
        <p className="page-subtitle mb-6">Your personal workload</p>
      ) : (
        <div className="mb-6" />
      )}
      {!data ? (
        <p className="text-slate-500">Loading…</p>
      ) : data.users.length === 0 ? (
        <p className="text-sm text-slate-400">No workload data available.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="p-3">Employee</th>
                <th className="p-3">Active tasks</th>
                <th className="p-3">Effort</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Load</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => {
                const pct = Math.round((u.active_task_count / Math.max(u.max_active_tasks, 1)) * 100);
                return (
                  <tr key={u.user_id} className="table-row">
                    <td className="p-3 font-medium text-slate-200">{u.full_name}</td>
                    <td className="p-3 text-slate-300">{u.active_task_count}</td>
                    <td className="p-3 text-slate-300">{u.effort_sum}</td>
                    <td className="p-3 text-slate-300">{u.max_active_tasks}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-surface-elevated">
                          <div
                            className={`h-2 rounded-full ${loadBarColor(pct)}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-slate-400">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
