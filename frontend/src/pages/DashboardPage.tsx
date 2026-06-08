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
import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP_STYLE } from "../utils/chartTheme";

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

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
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
    <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm shadow-card">
      <p className="font-medium text-slate-200">{fullName}</p>
      <p className="text-slate-400">{tasks} active task{tasks === 1 ? "" : "s"}</p>
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
    if (isEmployee && user?.department_id) return api.workload(user.department_id);
    return api.workload();
  }, [isEmployee, user?.department_id]);

  const loadCompleted = useCallback(async (preset: PeriodPreset, fromDate?: string) => {
    setCompletedLoading(true);
    try {
      if (preset === "custom" && fromDate) {
        const to = todayIso();
        const data = await api.completedOverTime({ from: fromDate, to });
        setCompleted(data);
        setCompletedTitle(`Completed tasks (${formatShortDate(fromDate)} - ${formatShortDate(to)})`);
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
    if (preset !== "custom") void loadCompleted(preset);
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Task trends</h1>
          <p className="page-subtitle">Intelligent task routing & workload optimization</p>
        </div>
        <Link to="/tasks/new" className="btn-primary">+ New task</Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tasks" value={pipeline?.total ?? 0} accent="text-slate-100" />
        <StatCard label="Assigned" value={pipeline?.by_status?.assigned ?? 0} accent="text-chart-blue" />
        <StatCard label="In Progress" value={pipeline?.in_progress ?? 0} accent="text-chart-orange" />
        <StatCard label="Completed Today" value={pipeline?.completed_today ?? 0} accent="text-chart-green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Tasks by status</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-slate-600">No tasks yet. Submit one to see analytics.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pieData.map((e) => (
                    <Cell key={e.status} fill={STATUS_COLORS[e.status] ?? "#64748b"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-400">Team workload</h2>
          {isEmployee && <p className="mb-3 text-xs text-slate-600">Department overview (read-only)</p>}
          {barData.length === 0 ? (
            <p className="text-sm text-slate-600">No team members to display.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis type="number" stroke={CHART_AXIS} tick={{ fill: CHART_AXIS, fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fill: CHART_AXIS, fontSize: 11 }} />
                <Tooltip content={<WorkloadTooltip />} />
                <Bar dataKey="tasks" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-slate-300">{completedTitle}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {PERIOD_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`chip ${periodPreset === preset.value ? "chip-active" : ""}`}
                >
                  {preset.label}
                </button>
              ))}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500" htmlFor="completed-from">From</label>
                <input
                  id="completed-from"
                  type="date"
                  value={customFrom}
                  max={todayIso()}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="input-date"
                />
                <span className="text-xs text-slate-600">to today</span>
                <button type="button" onClick={handleCustomApply} disabled={!customFrom} className="chip disabled:opacity-50">
                  Apply
                </button>
              </div>
            </div>
          </div>
          {completedLoading ? (
            <p className="text-sm text-slate-600">Updating chart…</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={completed}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="date" tick={{ fill: CHART_AXIS, fontSize: 11 }} stroke={CHART_AXIS} />
                <YAxis allowDecimals={false} tick={{ fill: CHART_AXIS, fontSize: 11 }} stroke={CHART_AXIS} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
