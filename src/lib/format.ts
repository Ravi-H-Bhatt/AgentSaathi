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
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Show policies that renew within the next 30 days
  // This handles renewals across years correctly
  // For example: if today is Sept 15, 2026, and a policy renews on Oct 3, 2025,
  // we check if Oct 3, 2026 (same date next occurrence) is within 30 days
  
  // Create a "next occurrence" date by taking the renewal date and adjusting the year
  let nextRenewal = new Date(date);
  
  // If the renewal date (with current year) has already passed, use next year
  nextRenewal.setFullYear(now.getFullYear());
  if (nextRenewal < now) {
    nextRenewal.setFullYear(now.getFullYear() + 1);
  }
  
  // Check if this next renewal is within 30 days from now
  return nextRenewal >= now && nextRenewal <= thirtyDaysFromNow;
}

/**
 * Renewal-date logic used everywhere (dashboard filter, sort, and display).
 *
 * We use the ACTUAL stored renewal date — no year "rolling". This keeps things
 * predictable and matches how agents think:
 *   - If the renewal date is BEFORE today  → it's OVERDUE by that many days.
 *   - If it's today                        → due today.
 *   - If it's in the future                → renews in that many days.
 *
 * A policy whose stored renewal date is, say, 03 Jul 2027 is genuinely ~357
 * days away (NOT overdue) and simply won't fall inside the dashboard's
 * near-term window.
 */
export function effectiveRenewalDate(
  d: string | null | undefined,
  _today?: Date
): Date | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Whole days from today until the stored renewal date.
 *   - Negative → overdue by that many days (show OVERDUE).
 *   - 0 → due today.
 *   - Positive → renews in that many days.
 */
export function daysUntil(d: string | null | undefined, today?: Date): number | null {
  const date = effectiveRenewalDate(d);
  if (!date) return null;
  const now = today ? new Date(today) : new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((date.getTime() - now.getTime()) / 86_400_000);
}

/**
 * The renewal date as YYYY-MM-DD for display (the real stored date, unchanged).
 */
export function getAdjustedRenewalDate(
  d: string | null | undefined,
  _today?: Date
): string | null {
  const date = effectiveRenewalDate(d);
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
