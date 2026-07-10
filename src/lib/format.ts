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
  now.setHours(0, 0, 0, 0);
  
  const renewalDate = new Date(date);
  renewalDate.setHours(0, 0, 0, 0);
  
  // Calculate days difference from stored date
  const daysDiff = Math.floor((renewalDate.getTime() - now.getTime()) / 86_400_000);
  
  // If overdue by 1-3 days, return negative (show as OVERDUE)
  if (daysDiff < 0 && daysDiff >= -3) {
    return daysDiff;
  }
  
  // If overdue by more than 3 days, adjust to next year occurrence
  if (daysDiff < -3) {
    let nextRenewal = new Date(renewalDate);
    nextRenewal.setFullYear(now.getFullYear() + 1);
    return Math.floor((nextRenewal.getTime() - now.getTime()) / 86_400_000);
  }
  
  // Future dates - return as-is
  return daysDiff;
}

/**
 * Get the next renewal date adjusted to current/future year.
 * Example: If renewal_date is "2025-07-11" and today is after that,
 * returns "2026-07-11" for display purposes.
 * BUT: if overdue by only 1-3 days, keep the original date to show it's overdue.
 */
export function getAdjustedRenewalDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const renewalDate = new Date(date);
  renewalDate.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((renewalDate.getTime() - now.getTime()) / 86_400_000);
  
  // If overdue by 1-3 days, return original date (to show OVERDUE)
  if (daysDiff < 0 && daysDiff >= -3) {
    return d;
  }
  
  // If overdue by more than 3 days, adjust to next year
  if (daysDiff < -3) {
    let nextRenewal = new Date(renewalDate);
    nextRenewal.setFullYear(now.getFullYear() + 1);
    return nextRenewal.toISOString().split('T')[0];
  }
  
  // Future dates - return as-is
  return d;
}
