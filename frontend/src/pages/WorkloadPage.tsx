import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { api, type WorkloadResponse } from "../api/client";

export default function WorkloadPage() {
  const [data, setData] = useState<WorkloadResponse | null>(null);

  useEffect(() => {
    api.workload().then(setData);
  }, []);

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold">Team workload</h1>
      {!data ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
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
                const color = pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-amber-400" : "bg-green-500";
                return (
                  <tr key={u.user_id} className="border-t">
                    <td className="p-3 font-medium">{u.full_name}</td>
                    <td className="p-3">{u.active_task_count}</td>
                    <td className="p-3">{u.effort_sum}</td>
                    <td className="p-3">{u.max_active_tasks}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-100">
                          <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span>{pct}%</span>
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
