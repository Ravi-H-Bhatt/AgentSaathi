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

export function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  
  const now = new Date();
  // Adjust to next occurrence if the date has passed
  let nextRenewal = new Date(date);
  nextRenewal.setFullYear(now.getFullYear());
  if (nextRenewal < now) {
    nextRenewal.setFullYear(now.getFullYear() + 1);
  }
  
  return Math.ceil((nextRenewal.getTime() - now.getTime()) / 86_400_000);
}

/**
 * Get the next renewal date adjusted to current/future year.
 * Example: If renewal_date is "2025-07-11" and today is after that,
 * returns "2026-07-11" for display purposes.
 */
export function getAdjustedRenewalDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  
  const now = new Date();
  let nextRenewal = new Date(date);
  nextRenewal.setFullYear(now.getFullYear());
  
  // If that date has passed this year, use next year
  if (nextRenewal < now) {
    nextRenewal.setFullYear(now.getFullYear() + 1);
  }
  
  return nextRenewal.toISOString().split('T')[0];
}
