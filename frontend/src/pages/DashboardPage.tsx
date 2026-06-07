import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";

const STATUS_COLORS: Record<string, string> = {
  open: "#94a3b8",
  assigned: "#3b82f6",
  in_progress: "#f59e0b",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";
  const [pipeline, setPipeline] = useState<Awaited<ReturnType<typeof api.pipeline>> | null>(null);
  const [workload, setWorkload] = useState<Awaited<ReturnType<typeof api.workload>> | null>(null);
  const [completed, setCompleted] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isManager) {
      Promise.all([api.pipeline(), api.workload(), api.completedOverTime(14)])
        .then(([p, w, c]) => {
          setPipeline(p);
          setWorkload(w);
          setCompleted(c);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      api.listTasks().then((r) => {
        const items = r.items;
        const byStatus: Record<string, number> = {};
        items.forEach((t) => { byStatus[t.status] = (byStatus[t.status] ?? 0) + 1; });
        setPipeline({
          total: items.length,
          open: byStatus.open ?? 0,
          in_progress: byStatus.in_progress ?? 0,
          completed_today: 0,
          by_status: byStatus,
        });
      }).finally(() => setLoading(false));
    }
  }, [isManager]);

  const pieData = pipeline
    ? Object.entries(pipeline.by_status)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const barData = workload?.users.map((u) => ({ name: u.full_name.split(" ")[0], tasks: u.active_task_count })) ?? [];

  if (loading) {
    return (
      <AppLayout>
        <p className="text-slate-500">Loading dashboard…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Intelligent task routing & workload optimization</p>
        </div>
        <Link
          to="/tasks/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + New task
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tasks" value={pipeline?.total ?? 0} color="text-slate-900" icon="📋" />
        <StatCard label="Open" value={pipeline?.open ?? 0} color="text-blue-600" icon="📂" />
        <StatCard label="In Progress" value={pipeline?.in_progress ?? 0} color="text-amber-600" icon="⚡" />
        <StatCard label="Completed Today" value={pipeline?.completed_today ?? 0} color="text-green-600" icon="✅" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Tasks by status</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-slate-400">No tasks yet. Submit one to see analytics.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pieData.map((e) => (
                    <Cell key={e.name} fill={STATUS_COLORS[e.name] ?? "#64748b"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Team workload</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={60} />
              <Tooltip />
              <Bar dataKey="tasks" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-800">Completed tasks (14 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={completed}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppLayout>
  );
}
