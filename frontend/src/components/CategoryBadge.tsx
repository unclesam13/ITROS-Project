const CATEGORY_STYLES: Record<string, string> = {
  administrative: "bg-chart-blue/20 text-chart-blue",
  finance: "bg-chart-green/20 text-chart-green",
  technical: "bg-chart-purple/20 text-chart-purple",
  support: "bg-chart-orange/20 text-chart-orange",
  hr: "bg-pink-500/20 text-pink-400",
  general: "bg-slate-500/20 text-slate-400",
};

export default function CategoryBadge({ category }: { category: string }) {
  const key = category.toLowerCase();
  const style = CATEGORY_STYLES[key] ?? CATEGORY_STYLES.general;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style}`}>
      {category}
    </span>
  );
}
