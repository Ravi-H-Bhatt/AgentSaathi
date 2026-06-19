export function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}

export function shortDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isThisMonth(d: string | null | undefined): boolean {
  if (!d) return false;
  const date = new Date(d);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}
