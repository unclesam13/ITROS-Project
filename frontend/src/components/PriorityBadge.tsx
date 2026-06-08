const STYLES: Record<string, { badge: string; icon: string }> = {
  low: { badge: "bg-slate-500/20 text-slate-400", icon: "↓" },
  medium: { badge: "bg-chart-blue/20 text-chart-blue", icon: "=" },
  high: { badge: "bg-chart-orange/20 text-chart-orange", icon: "↑" },
  critical: { badge: "bg-red-500/20 text-red-400", icon: "‼" },
};

export default function PriorityBadge({ priority, showIcon = false }: { priority: string; showIcon?: boolean }) {
  const style = STYLES[priority] ?? STYLES.medium;
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>
      {showIcon && <span>{style.icon}</span>}
      {priority}
    </span>
  );
}
