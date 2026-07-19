/**
 * LIC premium-due renewal maths.
 *
 * LIC policies pay premiums on a recurring cycle set by the "Mode":
 *   Monthly (Mly) → every 1 month
 *   Quarterly (Qly) → every 3 months
 *   Half-Yearly (Hly) → every 6 months
 *   Yearly (Yly) → every 12 months
 *
 * The due DAY comes from the Date of Commencement (D.o.C). The FUP ("First
 * Unpaid Premium", MM/YYYY on the report) tells us the earliest unpaid month.
 * The stored `renewal_date` is the FUP anchor (D.o.C day + FUP month/year).
 * From that anchor we step forward by the mode interval to find the next due
 * date on/after today, so a monthly policy surfaces every month, a quarterly
 * one every three months, etc.
 *
 * These are pure functions (safe on client and server).
 */

/** Months between installments for a mode, or null if unknown. */
export function licModeMonths(mode: string | null | undefined): number | null {
  if (!mode) return null;
  const m = mode.trim().toLowerCase();
  if (m === "mly" || m.startsWith("mon")) return 1;
  if (m === "qly" || m.startsWith("qua") || m.startsWith("quar")) return 3;
  if (m === "hly" || m.startsWith("half")) return 6;
  if (m === "yly" || m.startsWith("year") || m.startsWith("ann")) return 12;
  return null;
}

/** Human label for a mode, e.g. "Monthly". */
export function licModeLabel(mode: string | null | undefined): string | null {
  const months = licModeMonths(mode);
  switch (months) {
    case 1:
      return "Monthly";
    case 3:
      return "Quarterly";
    case 6:
      return "Half-Yearly";
    case 12:
      return "Yearly";
    default:
      return mode ?? null;
  }
}

/** Days in a given month (year, month 1-12). */
function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

/** Build a Date at local midnight for year/month(1-12)/day, clamping the day. */
function makeDate(year: number, month1: number, day: number): Date {
  const dim = daysInMonth(year, month1);
  const d = new Date(year, month1 - 1, Math.min(day, dim));
  d.setHours(0, 0, 0, 0);
  return d;
}

// Treat a due date as still "current" (not yet rolled forward) for a few days
// after it passes, matching the home dashboard's overdue grace.
const OVERDUE_GRACE_DAYS = 5;

/**
 * The next premium due date, computed PURELY from the Date of Commencement
 * (D.o.C) and the Mode — exactly the LIC schedule:
 *   • the due DAY is the D.o.C day (clamped to the month length),
 *   • occurrences recur every {1,3,6,12} months from the D.o.C month.
 *
 * Returns the first occurrence on/after (today − grace). If `paidThroughISO`
 * is given (an installment already collected), the result is the first
 * occurrence strictly AFTER that date, so a collected premium rolls to the
 * next cycle. Returns null when inputs are unusable.
 */
export function nextLicDueDate(
  docISO: string | null | undefined,
  mode: string | null | undefined,
  today?: Date,
  paidThroughISO?: string | null
): Date | null {
  if (!docISO) return null;
  const doc = new Date(docISO);
  if (isNaN(doc.getTime())) return null;

  // Default to yearly if the mode is missing/unrecognised (safest for life
  // policies) so we never step in a way that spams the list.
  const step = licModeMonths(mode) ?? 12;

  const now = today ? new Date(today) : new Date();
  now.setHours(0, 0, 0, 0);

  // Lower bound: today − grace, but never on/before an already-collected date.
  let lowerMs = now.getTime() - OVERDUE_GRACE_DAYS * 86_400_000;
  if (paidThroughISO) {
    const paid = new Date(paidThroughISO);
    if (!isNaN(paid.getTime())) {
      paid.setHours(0, 0, 0, 0);
      // strictly after the paid installment
      lowerMs = Math.max(lowerMs, paid.getTime() + 86_400_000);
    }
  }

  const day = doc.getDate();
  let monthIndex = doc.getFullYear() * 12 + doc.getMonth(); // 0-based month

  // Advance to the first cycle date >= lower bound. Bounded for safety.
  for (let i = 0; i < 20000; i++) {
    const year = Math.floor(monthIndex / 12);
    const month1 = (monthIndex % 12) + 1;
    const due = makeDate(year, month1, day);
    if (due.getTime() >= lowerMs) return due;
    monthIndex += step;
  }
  return null;
}

/** ISO (YYYY-MM-DD) of the next LIC due date (from D.o.C + mode). */
export function getLicNextDueISO(
  docISO: string | null | undefined,
  mode: string | null | undefined,
  today?: Date,
  paidThroughISO?: string | null
): string | null {
  const d = nextLicDueDate(docISO, mode, today, paidThroughISO);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Whole days until the next LIC due date (computed from D.o.C + mode).
 *   Negative → overdue by that many days.
 *   0 → due today.
 *   Positive → upcoming.
 */
export function licDaysUntil(
  docISO: string | null | undefined,
  mode: string | null | undefined,
  today?: Date,
  paidThroughISO?: string | null
): number | null {
  const due = nextLicDueDate(docISO, mode, today, paidThroughISO);
  if (!due) return null;
  const now = today ? new Date(today) : new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}
