export function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight
          ? "bg-foreground text-background border-foreground"
          : "bg-card border-border"
      }`}
    >
      <p
        className={`text-sm ${highlight ? "text-background/70" : "text-muted"}`}
      >
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
    </div>
  );
}
