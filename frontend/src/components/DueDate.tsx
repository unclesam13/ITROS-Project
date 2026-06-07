export function isOverdue(deadline: string | null | undefined, status: string): boolean {
  if (!deadline || status === "completed" || status === "cancelled") return false;
  return new Date(deadline) < new Date();
}

export default function DueDate({ deadline, status }: { deadline?: string | null; status: string }) {
  if (!deadline) return <span className="text-slate-400">—</span>;
  const overdue = isOverdue(deadline, status);
  return (
    <span className={overdue ? "font-medium text-red-600" : "text-slate-700"}>
      {new Date(deadline).toLocaleDateString()}
      {overdue && " (overdue)"}
    </span>
  );
}
