import type { RegisterRow } from "@/lib/types";

/**
 * PARSER: New India "Premium And Commission Bill Report"
 *
 * A different New India report from the "Policy Expiry Register". Its text layer
 * is clean and linear, so we parse deterministically (no LLM, 100% accurate).
 *
 * Each record in the flattened text looks like:
 *   210600 SI00282483 1D6342095 MANOJ C GILDER 794 34 Health Insurance
 *   21060061252800003220 : : Individual Mr KARTIK MAHESHWARI
 *   25-Sep-2025 30-Sep-2025 29-Sep-2026 13,786 2,068 0 0 0 0
 *
 * Columns: Operating Office, Site Code, Dev Officer Code, Dev Officer Name,
 *   Lob Description, Policy Number, Endorsement Number, Policy Holder Type,
 *   Policy Holder Name, Transaction Date, Effective Start Date,
 *   Policy Expiry Date, Premium, Commission, Portal Expenses, incentives…
 *
 * We anchor on the 18-22 digit Policy Number, which makes extraction robust even
 * when a row wraps across a page (dropping the dev-officer trailing code).
 */

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** "29-Sep-2026" -> "2026-09-29" */
function isoDate(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return null;
  const mm = MONTHS[m[2].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1]}`;
}

/** "13,786" -> 13786 ; "0" -> 0 ; invalid -> null */
function money(s: string | undefined): number | null {
  if (s == null) return null;
  const c = s.replace(/,/g, "").trim();
  if (!/^\d+$/.test(c)) return null;
  return parseInt(c, 10);
}

/** Detect this specific New India report by its unique header phrase. */
export function looksLikeNewIndiaPremiumBill(text: string): boolean {
  const head = text.slice(0, 4000);
  return (
    /premium\s+and\s+commission\s+bill\s+report/i.test(head) &&
    /new\s+india/i.test(head)
  );
}

/**
 * Parse the Premium And Commission Bill Report into rows.
 * One row per policy line (including zero-premium renewal/endorsement lines).
 */
export function parseNewIndiaPremiumBill(text: string): RegisterRow[] {
  const t = text.replace(/\s+/g, " ");
  const rows: RegisterRow[] = [];

  // lobCode  lobDesc  policyNumber : endorsement : holderType  holderName
  //   txnDate  effectiveStart  policyExpiry  premium  commission
  const re =
    /(\d{1,3})\s+([A-Za-z][A-Za-z ]*?)\s+(\d{18,22})\s*:\s*[^:]*?:\s*(Individual|Organi[sz]ational)\s+(.+?)\s+(\d{2}-[A-Za-z]{3}-\d{4})\s+(\d{2}-[A-Za-z]{3}-\d{4})\s+(\d{2}-[A-Za-z]{3}-\d{4})\s+([\d,]+)\s+([\d,]+)/gi;

  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const lobCode = m[1];
    const lobDescRaw = m[2];
    const policyNumber = m[3];
    const holderType = m[4];
    const nameRaw = m[5];
    const effStart = m[7];
    const expiry = m[8];
    const premiumRaw = m[9];

    const lob = `${lobCode} ${lobDescRaw}`.replace(/\s+/g, " ").trim();
    const name = nameRaw.replace(/\s+/g, " ").trim();

    rows.push({
      sn: null,
      client_name: name || null,
      client_phone: null,
      client_address: null,
      company: "New India",
      policy_holder_type: holderType,
      policy_number: policyNumber,
      policy_type: lob || null,
      product_name: null,
      mode: null,
      start_date: isoDate(effStart),
      renewal_date: isoDate(expiry),
      premium: money(premiumRaw),
      sum_insured: 0, // this report has no sum-insured column
    });
  }

  return rows;
}
