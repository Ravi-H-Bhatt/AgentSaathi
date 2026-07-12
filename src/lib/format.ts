export function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}

/**
 * Resolve the insurer/company name for a policy.
 * Prefers the stored company; otherwise infers it from the product name so
 * existing rows (imported before company was captured) still show correctly.
 * New India registers use products like "New India Mediclaim Policy".
 */
export function companyLabel(
  company: string | null | undefined,
  productName?: string | null
): string | null {
  if (company && company.trim()) return company.trim();
  const p = (productName || "").trim();
  if (/new\s*india/i.test(p)) return "New India";
  return null;
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

// How many days after a renewal date we still treat it as OVERDUE (rather than
// rolling to next year). e.g. today 11 Jul → renewals from 06–11 Jul are OVERDUE.
export const OVERDUE_GRACE_DAYS = 5;

/**
 * CANONICAL recurring-renewal logic used everywhere (dashboard filter, sort,
 * and display) so they always agree.
 *
 * Policies renew annually on the SAME dd/mm. We map the stored month/day to the
 * occurrence relevant RIGHT NOW (ignoring the stored YEAR):
 *   - Use THIS year's occurrence if it's upcoming, or overdue by ≤ 5 days.
 *   - If this year's occurrence is more than 5 days in the past, roll to NEXT
 *     year's occurrence (that policy period is far off, not due now).
 *
 * Examples (today = 11 Jul 2026):
 *   - stored 26 May 2026 → this-yr 26 May is 46d past → roll → 26 May 2027 (~319d)
 *   - stored 25 Jul 2027 → this-yr 25 Jul is +14d → in 14d
 *   - stored 08 Jul 2025 → this-yr 08 Jul is 3d past → OVERDUE 3d
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

  // More than 5 days past → the relevant renewal is next year's occurrence.
  if (deltaDays < -OVERDUE_GRACE_DAYS) {
    occ.setFullYear(now.getFullYear() + 1);
  }

  return occ;
}

/**
 * Days until the effective (recurring) renewal.
 *   - Negative (−1 … −5) → overdue by that many days (show OVERDUE).
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
 * The effective (recurring) renewal date as YYYY-MM-DD, for display.
 */
export function getAdjustedRenewalDate(
  d: string | null | undefined,
  today?: Date
): string | null {
  const occ = effectiveRenewalDate(d, today);
  if (!occ) return null;
  const y = occ.getFullYear();
  const m = String(occ.getMonth() + 1).padStart(2, "0");
  const day = String(occ.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
