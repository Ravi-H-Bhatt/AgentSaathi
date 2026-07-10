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
 * CANONICAL recurring-renewal logic used everywhere (dashboard filter, sort,
 * and display) so they always agree.
 *
 * Policies renew annually, so we map the stored month/day to the occurrence
 * relevant RIGHT NOW:
 *   - This year's occurrence is used if it's upcoming OR overdue by ≤ 3 days.
 *   - If this year's occurrence is more than 3 days in the past, we roll to
 *     next year's occurrence (it has already been renewed / is far off).
 *
 * Returns the effective renewal Date (time-zeroed).
 */
export function effectiveRenewalDate(
  d: string | null | undefined,
  today?: Date
): Date | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;

  const now = today ? new Date(today) : new Date();
  now.setHours(0, 0, 0, 0);

  // This year's occurrence of the same month/day.
  const occ = new Date(date);
  occ.setHours(0, 0, 0, 0);
  occ.setFullYear(now.getFullYear());

  const deltaDays = Math.floor((occ.getTime() - now.getTime()) / 86_400_000);

  // Grace window: keep showing a renewal as OVERDUE for up to 7 days after it
  // passes (so agents can still follow up). Only once it's more than 7 days
  // past do we roll to next year's occurrence.
  if (deltaDays < -7) {
    occ.setFullYear(now.getFullYear() + 1);
  }

  return occ;
}

/**
 * Days until the effective (recurring) renewal.
 *   - Negative (−1, −2, −3) → overdue by that many days (show OVERDUE).
 *   - 0 → due today.
 *   - Positive → upcoming.
 */
export function daysUntil(d: string | null | undefined, today?: Date): number | null {
  const occ = effectiveRenewalDate(d, today);
  if (!occ) return null;
  const now = today ? new Date(today) : new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((occ.getTime() - now.getTime()) / 86_400_000);
}

/**
 * The effective renewal date (recurring) as YYYY-MM-DD, for display.
 */
export function getAdjustedRenewalDate(
  d: string | null | undefined,
  today?: Date
): string | null {
  const occ = effectiveRenewalDate(d, today);
  if (!occ) return null;
  // Local YYYY-MM-DD (avoid UTC shifting the day).
  const y = occ.getFullYear();
  const m = String(occ.getMonth() + 1).padStart(2, "0");
  const day = String(occ.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
