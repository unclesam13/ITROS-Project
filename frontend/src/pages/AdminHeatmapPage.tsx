import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../auth/AuthContext";
import { api, type HeatmapEntry } from "../api/client";

function loadBarColor(pct: number) {
  if (pct >= 70) return "bg-red-500";
  if (pct >= 40) return "bg-amber-400";
  return "bg-green-500";
}

export default function AdminHeatmapPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HeatmapEntry[]>([]);

  useEffect(() => {
    api.heatmap().then(setRows).catch(() => {});
  }, []);

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <h1 className="mb-2 text-2xl font-bold">Workload heatmap</h1>
      <p className="mb-6 text-sm text-slate-500">Organization-wide employee load distribution</p>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Department</th>
              <th className="p-3">Active</th>
              <th className="p-3">Load bar</th>
              <th className="p-3">Skills</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{r.full_name}</td>
                <td className="p-3">{r.department_name}</td>
                <td className="p-3">{r.active_task_count}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-32 rounded-full bg-slate-100">
                      <div className={`h-3 rounded-full ${loadBarColor(r.load_percent)}`} style={{ width: `${Math.min(r.load_percent, 100)}%` }} />
                    </div>
                    <span>{r.load_percent}%</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {r.skills.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      r.skills.map((s) => (
                        <span key={s} className="rounded bg-slate-100 px-2 py-0.5 text-xs">{s}</span>
                      ))
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
