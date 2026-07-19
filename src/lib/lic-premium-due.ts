import type { RegisterRow } from "@/lib/types";
import { licModeLabel } from "@/lib/lic-renewal";

/**
 * Parser for the LIC "Premium Due List For The Agent" report.
 *
 * Each data row is a fixed-column table line:
 *   S.No  PolicyNo  Name of Assured  D.o.C  Pln/Tm  Mod  FUP  [Flg]  InstPrem  Due  GST  TotPrem  EstCom
 *
 * We only keep the fields an agent actually needs and that drive the LIC
 * dashboard + renewal logic:
 *   - PolicyNo      → policy_number (UNIQUE — the dedup key)
 *   - Name          → client_name
 *   - D.o.C         → start_date (Date of Commencement; gives the due DAY)
 *   - Pln/Tm        → policy_type (plan/term, e.g. "945/69")
 *   - Mod           → mode (normalised to Monthly/Quarterly/Half-Yearly/Yearly)
 *   - FUP (MM/YYYY) → renewal anchor (D.o.C day + FUP month/year)
 *   - InstPrem      → premium (the recurring installment amount)
 *   - TotPrem, Due  → kept in raw_extract (this report's arrears total & count)
 *
 * GST (always 0) and EstCom (commission) are intentionally discarded.
 *
 * The parser is fully deterministic (no AI) so extraction is bulletproof and
 * repeatable. It tolerates the messy PDF text layer: names glued to the D.o.C
 * (e.g. "PRAJPAPATI28/05/2011") and the whole document arriving as one line.
 */

export interface LicDueRow extends RegisterRow {
  /** First Unpaid Premium as printed, "MM/YYYY". */
  fup?: string | null;
  /** FUP resolved to a full date (D.o.C day + FUP month/year), ISO. */
  fup_date?: string | null;
  /** Recurring installment premium (InstPrem). */
  inst_prem?: number | null;
  /** This report's total due (TotPrem = InstPrem × Due). */
  tot_prem?: number | null;
  /** Number of installments due on this report. */
  due_count?: number | null;
  /** Plan code (before the slash in Pln/Tm). */
  plan?: string | null;
  /** Term (after the slash in Pln/Tm). */
  term?: string | null;
  /** Flag column (ST / FY / LP / MT), if any. */
  flag?: string | null;
  /** Report's due month, "MM/YYYY". */
  report_month?: string | null;
}

const MODE_TOKENS = new Set(["MLY", "QLY", "HLY", "YLY"]);
const FLAG_TOKENS = new Set(["ST", "FY", "LP", "MT"]);

const DOC_RE = /^\d{2}\/\d{2}\/\d{4}$/; // D.o.C  dd/mm/yyyy
const FUP_RE = /^\d{2}\/\d{4}$/; // FUP    mm/yyyy
const PLAN_RE = /^\d{1,3}\/\d{1,3}$/; // Pln/Tm 945/69
const POLICY_RE = /^\d{9}$/; // 9-digit LIC policy number
const SN_RE = /^\d{1,4}$/; // serial number
const DEC_RE = /^\d+\.\d{2}$/; // 11229.00 / 0.00
const INT_RE = /^\d+$/;

/**
 * Does this text look like an LIC Premium Due List report?
 *
 * Robust against text-layer quirks: we scan the WHOLE document and rely on the
 * report's UNIQUE column headers (InstPrem / TotPrem / EstCom / Pln-Tm) which
 * no other supported register uses, plus the title phrase. Any two strong
 * signals — or a data-shape match — is enough.
 */
export function looksLikeLicPremiumDueList(text: string): boolean {
  const t = text || "";

  // Strongest signal: the exact report title.
  if (/premium\s+due\s+list\s+for\s+the\s+agent/i.test(t)) return true;

  // Unique column-header tokens (these are specific to this LIC report).
  const signals = [
    /premium\s+due\s+list/i,
    /name\s+of\s+assured/i,
    /\bInstPrem\b/i,
    /\bTotPrem\b/i,
    /\bEstCom\b/i,
    /\bPln\s*\/?\s*Tm\b/i,
  ].reduce((n, re) => (re.test(t) ? n + 1 : n), 0);
  if (signals >= 2) return true;

  // Data-shape fallback: many mm/yyyy FUP tokens + 9-digit policies + modes.
  const fupHits = (t.match(/\b\d{2}\/\d{4}\b/g) || []).length;
  const modeHits = (t.match(/\b(Mly|Qly|Hly|Yly)\b/g) || []).length;
  const policyHits = (t.match(/\b\d{9}\b/g) || []).length;
  return (
    signals >= 1 && fupHits >= 5 && modeHits >= 5 && policyHits >= 5
  );
}

/** dd/mm/yyyy → ISO yyyy-mm-dd (or null). */
function docToIso(ddmmyyyy: string): string | null {
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** Number of days in a month (year, month 1-12). */
function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

/**
 * Resolve FUP (MM/YYYY) to a full date using the D.o.C day, clamped to the
 * month length (e.g. day 31 in a 30-day month → 30). Returns ISO or null.
 */
function fupToAnchorIso(fup: string, docIso: string | null): string | null {
  const m = fup.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const year = Number(m[2]);
  if (month < 1 || month > 12 || year < 1900 || year > 2100) return null;
  // Day comes from the D.o.C; default to the 28th if unknown (safe for all months).
  let day = 28;
  if (docIso) {
    const dm = docIso.match(/^\d{4}-\d{2}-(\d{2})$/);
    if (dm) day = Number(dm[1]);
  }
  day = Math.min(day, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Split a token with a glued dd/mm/yyyy date, e.g. "PRAJPAPATI28/05/2011". */
function splitGluedDoc(token: string): string[] {
  const m = token.match(/^(.*?)(\d{2}\/\d{2}\/\d{4})(.*)$/);
  if (!m) return [token];
  const out: string[] = [];
  if (m[1]) out.push(m[1]);
  out.push(m[2]);
  if (m[3]) out.push(m[3]);
  return out;
}

/** Flatten report text into a token stream, splitting glued D.o.C dates. */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    for (const piece of line.split(/\s+/)) {
      if (!piece) continue;
      for (const sub of splitGluedDoc(piece)) {
        if (sub) tokens.push(sub);
      }
    }
  }
  return tokens;
}

/** A record starts with <SN><9-digit policy no>. */
function isRecordStart(tokens: string[], i: number): boolean {
  return SN_RE.test(tokens[i]) && POLICY_RE.test(tokens[i + 1] || "");
}

/** Clean an assured name: collapse whitespace, drop trailing punctuation. */
function cleanName(name: string): string | null {
  const t = name.replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim();
  return t.length ? t : null;
}

/** Extract the report's due month ("MM/YYYY") from header/footer. */
function findReportMonth(text: string): string | null {
  const head = text.slice(0, 4000);
  const forMatch = head.match(/\bFor\s+(\d{2}\/\d{4})\b/i);
  if (forMatch) return forMatch[1];
  const dueMatch = text.match(/Due\s*(?:Month)?\s*:?\s*(\d{2}\/\d{4})/i);
  if (dueMatch) return dueMatch[1];
  const dashMatch = text.match(/Due\s*:\s*(\d{1,2})-(\d{4})/i);
  if (dashMatch) return `${dashMatch[1].padStart(2, "0")}/${dashMatch[2]}`;
  return null;
}

/** Parse one record between [start, end). */
function parseRecord(
  tokens: string[],
  start: number,
  end: number,
  reportMonth: string | null
): LicDueRow | null {
  const policyNumber = tokens[start + 1];
  if (!POLICY_RE.test(policyNumber || "")) return null;

  // Locate D.o.C (first dd/mm/yyyy), Pln/Tm, Mod, FUP within the record.
  let docIdx = -1;
  let planIdx = -1;
  let modeIdx = -1;
  let fupIdx = -1;
  for (let k = start + 2; k < end; k++) {
    const t = tokens[k];
    if (docIdx === -1 && DOC_RE.test(t)) {
      docIdx = k;
      continue;
    }
    if (docIdx !== -1) {
      if (planIdx === -1 && PLAN_RE.test(t)) planIdx = k;
      else if (modeIdx === -1 && MODE_TOKENS.has(t.toUpperCase())) modeIdx = k;
      else if (fupIdx === -1 && FUP_RE.test(t)) {
        fupIdx = k;
        break;
      }
    }
  }
  if (docIdx === -1 || fupIdx === -1) return null;

  const nameRaw = tokens.slice(start + 2, docIdx).join(" ");
  const clientName = cleanName(nameRaw);

  const docIso = docToIso(tokens[docIdx]);
  const planTerm = planIdx !== -1 ? tokens[planIdx] : null;
  const [plan, term] = planTerm ? planTerm.split("/") : [null, null];
  const rawMode = modeIdx !== -1 ? tokens[modeIdx] : null;
  const mode = licModeLabel(rawMode);
  const fup = tokens[fupIdx];
  const fupDate = fupToAnchorIso(fup, docIso);

  // Numeric tail after FUP (skipping an optional flag):
  //   InstPrem(dec)  Due(int)  GST(dec)  TotPrem(int)  [EstCom(dec) — ignored]
  let instPrem: number | null = null;
  let dueCount: number | null = null;
  let totPrem: number | null = null;
  let flag: string | null = null;
  let stage = 0; // 0=want instPrem, 1=want due, 2=want gst, 3=want totPrem, 4=done
  for (let k = fupIdx + 1; k < end && stage < 4; k++) {
    const t = tokens[k];
    if (stage === 0) {
      if (FLAG_TOKENS.has(t.toUpperCase())) {
        flag = t.toUpperCase();
        continue;
      }
      if (DEC_RE.test(t)) {
        instPrem = Number(t);
        stage = 1;
      }
    } else if (stage === 1) {
      if (INT_RE.test(t)) {
        dueCount = Number(t);
        stage = 2;
      }
    } else if (stage === 2) {
      if (DEC_RE.test(t)) stage = 3; // GST (ignored)
    } else if (stage === 3) {
      if (INT_RE.test(t)) {
        totPrem = Number(t);
        stage = 4;
      }
    }
  }

  return {
    sn: SN_RE.test(tokens[start]) ? Number(tokens[start]) : null,
    client_name: clientName,
    client_phone: null,
    client_address: null,
    company: "LIC",
    policy_holder_type: null,
    policy_number: policyNumber,
    previous_policy_number: null,
    policy_type: planTerm,
    product_name: null,
    mode,
    start_date: docIso,
    renewal_date: fupDate,
    premium: instPrem,
    sum_insured: null,
    // LIC-specific extras (carried to the save endpoint, kept in raw_extract).
    fup,
    fup_date: fupDate,
    inst_prem: instPrem,
    tot_prem: totPrem,
    due_count: dueCount,
    plan: plan ?? null,
    term: term ?? null,
    flag,
    report_month: reportMonth,
  };
}

/** Parse the full LIC Premium Due List into deduped-by-caller rows. */
export function parseLicPremiumDueList(text: string): LicDueRow[] {
  const tokens = tokenize(text);
  const reportMonth = findReportMonth(text);

  const starts: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (isRecordStart(tokens, i)) starts.push(i);
  }

  const rows: LicDueRow[] = [];
  for (let s = 0; s < starts.length; s++) {
    const start = starts[s];
    const end = s + 1 < starts.length ? starts[s + 1] : tokens.length;
    const row = parseRecord(tokens, start, end, reportMonth);
    if (row && row.policy_number && row.client_name) rows.push(row);
  }
  return rows;
}
