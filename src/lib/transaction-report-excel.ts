/**
 * Parse a "Transaction Report" style Excel export (e.g. M080 business details).
 *
 * Columns are matched by HEADER NAME (not fixed positions), so the header row
 * can sit on any row and extra columns are ignored. Mapped fields:
 *   Ins.Co         -> company
 *   Type Of Policy -> policy_type
 *   Name of Client -> client_name
 *   Total          -> premium
 *   PolicyNo       -> policy_number
 *   From Date      -> start_date
 *   To Date        -> renewal_date  (renews on the same day/month every year)
 *
 * Duplicate rows (same policy number + client) are collapsed so only unique
 * entries reach the database.
 */
import * as XLSX from "xlsx";
import type { RegisterRow } from "./types";

function toISODate(val: unknown): string | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${d.y}-${mm}-${dd}`;
    }
  }
  if (typeof val === "string") {
    const s = val.trim();
    // dd/mm/yyyy or dd-mm-yyyy
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (m) {
      const [, dd, mm, yy] = m;
      const year = yy.length === 2 ? `20${yy}` : yy;
      return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }
  return null;
}

function toNumber(val: unknown): number | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[₹,\s]/g, ""));
    return isNaN(n) ? null : n;
  }
  return null;
}

function clean(val: unknown): string {
  if (val == null) return "";
  // Strip a leading apostrophe that Excel adds to force-text cells.
  return String(val).replace(/^'/, "").trim();
}

const ALIASES: Record<string, string[]> = {
  company: ["ins.co", "ins co", "insco", "insurer", "insurance company", "company"],
  policy_type: ["type of policy", "policy type", "producttype", "product type"],
  client_name: ["name of client", "client name", "insured name", "insured", "client"],
  premium: ["total", "gross premium", "premium", "total premium"],
  policy_number: ["policyno", "policy no", "policy number", "policy/endt number", "policy no."],
  start_date: ["from date", "start date", "from", "commencement date"],
  renewal_date: ["to date", "expiry date", "renewal date", "policy expiry date", "to"],
};

function matchColumn(header: string): string | null {
  // Normalise: lowercase, collapse internal whitespace, drop a trailing period.
  const h = header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\.$/, "");
  for (const [field, names] of Object.entries(ALIASES)) {
    if (names.includes(h)) return field;
  }
  return null;
}

/** True if the sheet looks like a Transaction Report (has the key headers). */
export function looksLikeTransactionReport(buffer: Buffer): boolean {
  try {
    const { colOf } = mapColumns(buffer);
    return colOf.client_name != null && (colOf.company != null || colOf.policy_number != null) && colOf.premium != null;
  } catch {
    return false;
  }
}

function mapColumns(buffer: Buffer): {
  data: unknown[][];
  headerRow: number;
  colOf: Record<string, number>;
} {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  // Scan the first 25 rows for the one that maps the most known columns
  // (report exports can carry several preamble/title rows before the header).
  let bestRow = -1;
  let bestMap: Record<string, number> = {};
  for (let i = 0; i < Math.min(25, data.length); i++) {
    const row = data[i] || [];
    const map: Record<string, number> = {};
    row.forEach((cell, idx) => {
      const field = matchColumn(clean(cell));
      if (field && map[field] == null) map[field] = idx;
    });
    if (Object.keys(map).length > Object.keys(bestMap).length) {
      bestMap = map;
      bestRow = i;
    }
  }
  return { data, headerRow: bestRow, colOf: bestMap };
}

export function parseTransactionReportExcel(buffer: Buffer): RegisterRow[] {
  const { data, headerRow, colOf } = mapColumns(buffer);
  if (headerRow < 0 || colOf.client_name == null) return [];

  const get = (row: unknown[], field: string): unknown =>
    colOf[field] != null ? row[colOf[field]] : undefined;

  const rows: RegisterRow[] = [];
  const seen = new Set<string>();

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const clientName = clean(get(row, "client_name"));
    if (!clientName) continue; // no client → skip (blank/summary rows)

    const policyNumber = clean(get(row, "policy_number")) || null;
    const company = clean(get(row, "company")) || null;

    // Only unique entries: dedupe by policy number (or name+policy when blank).
    const key = (policyNumber || `${clientName}|noPolicy|${i}`).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      sn: null,
      client_name: clientName,
      client_phone: null,
      client_address: null,
      policy_number: policyNumber,
      policy_type: clean(get(row, "policy_type")) || null,
      policy_holder_type: null,
      product_name: null,
      company,
      mode: null,
      start_date: toISODate(get(row, "start_date")),
      renewal_date: toISODate(get(row, "renewal_date")),
      premium: toNumber(get(row, "premium")),
      sum_insured: null,
      previous_policy_number: null,
    });
  }

  console.log(`[transaction-report-excel] Parsed ${rows.length} unique policies`);
  return rows;
}
