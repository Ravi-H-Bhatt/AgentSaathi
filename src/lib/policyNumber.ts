/**
 * Canonical policy-number key used for de-duplication.
 *
 * The SAME policy is written differently across sources, so we normalise before
 * comparing:
 *   1. Lowercase + trim.
 *   2. Drop a trailing block of space-separated all-zero groups — e.g. Tata AIG
 *      writes "6500293839 00 00" where the book stores "6500293839".
 *   3. Strip every remaining non-alphanumeric (hyphens, spaces, dots, slashes),
 *      so "12-8428-0000331570-02" and "1284280000331570 02" are equal.
 *
 * Returns "" for a blank/absent number (caller then falls back to other fields).
 */
export function normalizePolicyNumber(raw: string | null | undefined): string {
  if (raw == null) return "";
  let s = String(raw).trim().toLowerCase();
  if (!s) return "";
  // Remove trailing whitespace-delimited zero-only groups (" 00 00", " 000", …).
  s = s.replace(/(\s+0+)+$/g, "");
  // Remove any remaining separators.
  s = s.replace(/[^a-z0-9]/g, "");
  return s;
}
