import { useCallback, useEffect, useState } from "react";
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
import { formatStatus } from "../utils/formatters";

const STATUS_COLORS: Record<string, string> = {
  open: "#94a3b8",
  assigned: "#3b82f6",
  in_progress: "#f59e0b",
  completed: "#22c55e",
};

const VALID_STATUSES = ["open", "assigned", "in_progress", "completed"] as const;

type PeriodPreset = 7 | 14 | 30 | 60 | 90 | "custom";

const PERIOD_PRESETS: { label: string; value: PeriodPreset; days?: number }[] = [
  { label: "7 days", value: 7, days: 7 },
  { label: "14 days", value: 14, days: 14 },
  { label: "1 month", value: 30, days: 30 },
  { label: "2 months", value: 60, days: 60 },
  { label: "3 months", value: 90, days: 90 },
];

function truncateName(name: string, max = 18): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function formatShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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

function WorkloadTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { fullName: string; tasks: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const { fullName, tasks } = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-slate-800">{fullName}</p>
      <p className="text-slate-600">{tasks} active task{tasks === 1 ? "" : "s"}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";
  const isEmployee = user?.role === "employee";
  const [pipeline, setPipeline] = useState<Awaited<ReturnType<typeof api.pipeline>> | null>(null);
  const [workload, setWorkload] = useState<Awaited<ReturnType<typeof api.workload>> | null>(null);
  const [completed, setCompleted] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(14);
  const [customFrom, setCustomFrom] = useState("");
  const [completedTitle, setCompletedTitle] = useState("Completed tasks (last 14 days)");
  const [completedLoading, setCompletedLoading] = useState(false);

  const workloadRequest = useCallback(() => {
    if (isEmployee && user?.department_id) {
      return api.workload(user.department_id);
    }
    return api.workload();
  }, [isEmployee, user?.department_id]);

  const loadCompleted = useCallback(async (preset: PeriodPreset, fromDate?: string) => {
    setCompletedLoading(true);
    try {
      if (preset === "custom" && fromDate) {
        const to = todayIso();
        const data = await api.completedOverTime({ from: fromDate, to });
        setCompleted(data);
        setCompletedTitle(`Completed tasks (${formatShortDate(fromDate)} – ${formatShortDate(to)})`);
      } else {
        const days = PERIOD_PRESETS.find((p) => p.value === preset)?.days ?? 14;
        const data = await api.completedOverTime({ days });
        setCompleted(data);
        const label = PERIOD_PRESETS.find((p) => p.value === preset)?.label ?? `${days} days`;
        setCompletedTitle(`Completed tasks (last ${label})`);
      }
    } catch {
      setCompleted([]);
    } finally {
      setCompletedLoading(false);
    }
  }, []);

  useEffect(() => {
    const pipelinePromise = isManager
      ? api.pipeline()
      : api.listTasks().then((r) => {
          const items = r.items;
          const byStatus: Record<string, number> = {};
          items.forEach((t) => { byStatus[t.status] = (byStatus[t.status] ?? 0) + 1; });
          return {
            total: items.length,
            open: byStatus.open ?? 0,
            in_progress: byStatus.in_progress ?? 0,
            completed_today: 0,
            by_status: byStatus,
          };
        });

    Promise.all([pipelinePromise, workloadRequest(), api.completedOverTime({ days: 14 })])
      .then(([p, w, c]) => {
        setPipeline(p);
        setWorkload(w);
        setCompleted(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isManager, workloadRequest]);

  const handlePresetSelect = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    if (preset !== "custom") {
      void loadCompleted(preset);
    }
  };

  const handleCustomApply = () => {
    if (!customFrom) return;
    setPeriodPreset("custom");
    void loadCompleted("custom", customFrom);
  };

  const pieData = pipeline
    ? Object.entries(pipeline.by_status)
        .filter(([name, v]) => v > 0 && VALID_STATUSES.includes(name as (typeof VALID_STATUSES)[number]))
        .map(([name, value]) => ({ name: formatStatus(name), value, status: name }))
    : [];

  const barData = workload?.users.map((u) => ({
    name: truncateName(u.full_name),
    fullName: u.full_name,
    tasks: u.active_task_count,
  })) ?? [];

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
                    <Cell key={e.status} fill={STATUS_COLORS[e.status] ?? "#64748b"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-semibold text-slate-800">Team workload</h2>
          {isEmployee && (
            <p className="mb-3 text-xs text-slate-400">Department overview (read-only)</p>
          )}
          {barData.length === 0 ? (
            <p className="text-sm text-slate-400">No team members to display.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                <Tooltip content={<WorkloadTooltip />} />
                <Bar dataKey="tasks" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-slate-800">{completedTitle}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {PERIOD_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    periodPreset === preset.value
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500" htmlFor="completed-from">
                  From
                </label>
                <input
                  id="completed-from"
                  type="date"
                  value={customFrom}
                  max={todayIso()}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                />
                <span className="text-xs text-slate-400">to today</span>
                <button
                  type="button"
                  onClick={handleCustomApply}
                  disabled={!customFrom}
                  className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
          {completedLoading ? (
            <p className="text-sm text-slate-400">Updating chart…</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={completed}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
