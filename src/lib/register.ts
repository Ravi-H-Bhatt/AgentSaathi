import type { RegisterRow } from "@/lib/types";
import { looksLikeNewIndiaRegister, parseNewIndiaRegister } from "./newindia";
import { looksLikeNewIndiaPremiumBill, parseNewIndiaPremiumBill } from "./newindia-premium";
import { looksLikeNewIndiaPolicySchedule, parseNewIndiaPolicySchedule } from "./newindia-policy";
import { looksLikeUnitedIndiaRegister, parseUnitedIndiaRegister } from "./unitedindia";
import { looksLikeTMIRegister, parseTMIRegister } from "./tmi";
import { looksLikeERegister, parseERegister } from "./eregister-parser";

/**
 * AUTO-DETECTING REGISTER PARSER
 * 
 * This module automatically detects the type of PDF register and uses the
 * appropriate parser:
 * 
 * 1. New India Assurance Policy Expiry Register (20-25 digit policy numbers)
 * 2. TMI E-Register (PZ transaction IDs, space-separated format)
 * 3. LIC Agent Register (9-digit policy numbers, fixed column format)
 * 
 * Each parser is optimized for its specific format to achieve maximum accuracy.
 */

/**
 * AUTO-DETECT and parse any supported register type.
 * Returns parsed policies with metadata about which parser was used.
 */
export async function parseRegisterAuto(text: string, buffer?: Buffer): Promise<{ 
  rows: RegisterRow[]; 
  type: 'newindia' | 'newindia-premium' | 'newindia-schedule' | 'unitedindia' | 'tmi' | 'eregister' | 'lic' | 'unknown';
  confidence: number;
}> {
  // United India Insurance "Premium Register" (text-based, deterministic).
  if (looksLikeUnitedIndiaRegister(text)) {
    console.log('[register] Detected: United India Insurance Premium Register');
    const rows = parseUnitedIndiaRegister(text);
    return { rows, type: 'unitedindia', confidence: 0.95 };
  }

  // New India single "Policy Schedule" (one policy, carries previous policy no).
  if (looksLikeNewIndiaPolicySchedule(text)) {
    console.log('[register] Detected: New India Policy Schedule (single policy)');
    const rows = parseNewIndiaPolicySchedule(text);
    return { rows, type: 'newindia-schedule', confidence: 0.95 };
  }

  // New India "Premium And Commission Bill Report" (text-based, deterministic).
  // Checked before the Policy Expiry Register since both are New India but have
  // distinct headers.
  if (looksLikeNewIndiaPremiumBill(text)) {
    console.log('[register] Detected: New India Premium And Commission Bill Report');
    const rows = parseNewIndiaPremiumBill(text);
    return { rows, type: 'newindia-premium', confidence: 0.95 };
  }

  // Check New India first (most distinctive: 20-25 digit policy numbers)
  if (looksLikeNewIndiaRegister(text)) {
    console.log('[register] Detected: New India Assurance Policy Expiry Register');
    const rows = await parseNewIndiaRegister(text);
    return { rows, type: 'newindia', confidence: 0.95 };
  }
  
  // Check E-Register (TMI multi-company format with PZ transaction IDs)
  if (looksLikeERegister(text)) {
    console.log('[register] Detected: E-Register (TMI Multi-Company Format)');
    // Use buffer if provided, otherwise convert text to buffer
    const pdfBuffer = buffer || Buffer.from(text);
    const rows = await parseERegister(pdfBuffer);
    return { rows, type: 'eregister', confidence: 0.95 };
  }
  
  // Check TMI E-Register (PZ transaction IDs, TMI header)
  if (looksLikeTMIRegister(text)) {
    console.log('[register] Detected: TMI E-Register');
    const rows = parseTMIRegister(text);
    return { rows, type: 'tmi', confidence: 0.95 };
  }
  
  // Fallback to LIC register parser
  if (looksLikeRegister(text)) {
    console.log('[register] Detected: LIC Agent Register');
    const rows = parseRegister(text);
    return { rows, type: 'lic', confidence: 0.85 };
  }
  
  console.warn('[register] Unknown register type, attempting LIC parser as fallback');
  const rows = parseRegister(text);
  return { rows, type: 'unknown', confidence: 0.5 };
}

/**
 * Legacy LIC Agent Register Parser
 * 
 * Parser for bulk "Policy Register" PDFs (e.g. LIC agent registers) that list
 * many policies in a fixed-column table:
 *
 *   SN | Policy No. | Name | D.O.C. | Plan | Mode | Premium | Sum Ass. | F.U.P. | Mobile No.
 *
 * These PDFs have strong, machine-detectable field signatures, so we parse them
 * deterministically (fast, free, no hallucination) rather than via an LLM:
 *   - SN: a running integer at the start of a record
 *   - Policy No.: a 9-digit number
 *   - D.O.C. / F.U.P.: dd/mm/yyyy dates
 *   - Plan: a slash token like 165/35/35 (or 5/47/27, nul/90/1)
 *   - Mode: one of Mly/QLY/HLY/YLY/SGL
 *   - Premium / Sum Ass.: integers (Premium can be split across lines)
 *   - Mobile No.: a 10-digit number, "0", or blank
 *
 * The PDF text layer is messy: names and large premium numbers wrap across
 * lines, some cells are glued together (e.g. "Shahhuf15/03/2019"), and there
 * are junk lines (page headers, "Test Message", totals). We flatten everything
 * to a token stream and walk it record-by-record, which tolerates all of that.
 */

const MODES = new Set(["MLY", "QLY", "HLY", "YLY", "SGL"]);
const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const PLAN_RE = /^(?:\d{1,3}|nul)\/\d{1,3}\/\d{1,3}$/i;
const POLICY_RE = /^\d{9}$/;

/** Phrases that mark non-data lines we must drop before tokenizing. */
const JUNK_LINE_RE =
  /^(policy register|total policy|total sa|total premium|test message|sn\b|policy no|name|d\.o\.c|plan|mode|premi|sum ass|f\.u\.p|mobile no|--\s*\d|\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}$|date\s*:)/i;

/**
 * Adjust a renewal date to current or next year if it's in the past.
 * Keeps the same day and month, but updates the year to ensure it's upcoming.
 */
function adjustRenewalToFuture(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const renewalYear = date.getFullYear();
  
  // If renewal is in a past year, move it to current or next year
  if (renewalYear < currentYear) {
    // Set to current year first
    date.setFullYear(currentYear);
    
    // If that date has already passed this year, move to next year
    if (date < now) {
      date.setFullYear(currentYear + 1);
    }
    
    return date.toISOString().split('T')[0];
  }
  
  return isoDate;
}

/** Quick check: does this look like a bulk register rather than one policy? */
export function looksLikeRegister(text: string): boolean {
  const head = text.slice(0, 8000);
  const hasHeader = /policy\s*register/i.test(head);
  const policyNumbers = (text.match(/\b\d{9}\b/g) || []).length;
  const modeHits = (text.match(/\b(Mly|QLY|HLY|YLY|SGL)\b/g) || []).length;
  // Many 9-digit policy numbers + many mode keywords => a multi-row table.
  return hasHeader || (policyNumbers >= 5 && modeHits >= 5);
}

function toIsoDate(ddmmyyyy: string): string | null {
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;
  const iso = `${yyyy}-${mm}-${dd}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : iso;
}

/**
 * Split a token that may have a date glued onto its end, e.g.
 * "Shahhuf15/03/2019" -> ["Shahhuf", "15/03/2019"] or "Dalal28/12/2003".
 * Also handles a date with text after it. Returns the pieces in order.
 */
function splitGluedDate(token: string): string[] {
  const m = token.match(/^(.*?)(\d{2}\/\d{2}\/\d{4})(.*)$/);
  if (!m) return [token];
  const out: string[] = [];
  if (m[1]) out.push(m[1]);
  out.push(m[2]);
  if (m[3]) out.push(m[3]);
  return out;
}

/**
 * Turn raw register text into a flat token stream, dropping junk lines and
 * splitting glued date tokens (e.g. "Shahhuf15/03/2019").
 *
 * IMPORTANT: we do NOT merge wrapped-number fragments here. Wrapped premium
 * tails arrive as their own short tokens between the two row dates; the record
 * parser reconstructs them from position. Trying to merge them in the token
 * stream is unsafe — a wrapped tail "0" is indistinguishable from a genuine
 * "Sum Ass. = 0" value and corrupts SA / F.U.P. / Mobile alignment.
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  // Some extractors (serverless unpdf) return the whole document as one line
  // with no newlines. Line-based junk filtering only applies when we actually
  // have multiple lines; otherwise we tokenize the whole stream by whitespace.
  const lines = text.split(/\r?\n/);
  const multiline = lines.length > 3;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (multiline && JUNK_LINE_RE.test(line)) continue;
    for (const piece of line.split(/\s+/)) {
      if (!piece) continue;
      for (const sub of splitGluedDate(piece)) {
        if (sub) tokens.push(sub);
      }
    }
  }
  return tokens;
}

function isRecordStart(tokens: string[], i: number): boolean {
  // A record starts with: <SN integer> <9-digit policy number> ...
  // The policy number may be the next token, or a couple of name tokens may
  // sit between (rare); we require the policy number immediately after SN,
  // which holds for the registers we target.
  return /^\d{1,5}$/.test(tokens[i]) && POLICY_RE.test(tokens[i + 1] || "");
}

/**
 * Parse one record beginning at `start` (which passes isRecordStart).
 *
 * Structure of every row (this is what we anchor on):
 *   SN  PolicyNo  Name…  DATE1(D.O.C.)  Plan  Mode  Premium  SumAss  DATE2(F.U.P.)  Mobile
 *
 * Both dates are always present, so we locate the FIRST date (D.O.C.) and the
 * SECOND date (F.U.P.). Everything before DATE1 (after the policy no) is the
 * name; the tokens BETWEEN the two dates hold Plan, Mode, Premium and SumAss;
 * after DATE2 comes the mobile. Within the between-block, SumAss is the LAST
 * numeric token and Premium is the remaining numeric tokens concatenated
 * (only the narrow Premium column wraps onto extra lines).
 */
function parseRecord(tokens: string[], start: number, end: number): { row: RegisterRow } {
  const sn = Number(tokens[start]);
  const policyNumber = tokens[start + 1];

  // Collect indices of the (at most first two) date tokens in this record.
  const dateIdx: number[] = [];
  for (let k = start + 2; k < end; k++) {
    if (DATE_RE.test(tokens[k])) {
      dateIdx.push(k);
      if (dateIdx.length === 2) break;
    }
  }

  const doc = dateIdx[0];
  const fup = dateIdx[1];

  // Name: tokens between policy number and the first date.
  const nameEnd = doc !== undefined ? doc : end;
  const name =
    tokens
      .slice(start + 2, nameEnd)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim() || null;

  const startDate = doc !== undefined ? toIsoDate(tokens[doc]) : null;
  let renewalDate = fup !== undefined ? toIsoDate(tokens[fup]) : null;
  
  // DON'T adjust renewal dates - preserve the original dates from PDFs
  // The analytics layer will handle multi-year display
  // if (renewalDate) {
  //   renewalDate = adjustRenewalToFuture(renewalDate);
  // }

  // Between-block (Plan, Mode, Premium…, SumAss) lives between the two dates.
  let policyType: string | null = null;
  let mode: string | null = null;
  let premium: number | null = null;
  let sumInsured: number | null = null;

  if (doc !== undefined && fup !== undefined) {
    const block = tokens.slice(doc + 1, fup);
    let b = 0;
    if (b < block.length && PLAN_RE.test(block[b])) {
      policyType = block[b];
      b++;
    }
    if (b < block.length && MODES.has((block[b] || "").toUpperCase())) {
      mode = block[b].toUpperCase();
      b++;
    }
    // Remaining tokens in the block are numbers: last = Sum Ass.,
    // the rest (joined) = Premium (handles premium wrapping across lines).
    const nums = block.slice(b).filter((t) => /^\d+$/.test(t));
    if (nums.length === 1) {
      // Only one number present — treat it as premium, SA unknown.
      premium = Number(nums[0]);
    } else if (nums.length >= 2) {
      sumInsured = Number(nums[nums.length - 1]);
      premium = Number(nums.slice(0, nums.length - 1).join(""));
    }
  }

  // Mobile: first 10-digit token after F.U.P. ("0"/blank => no phone).
  let phone: string | null = null;
  if (fup !== undefined) {
    for (let k = fup + 1; k < end; k++) {
      if (/^\d{10}$/.test(tokens[k])) {
        phone = tokens[k];
        break;
      }
      if (tokens[k] === "0") break;
    }
  }

  return {
    row: {
      sn: Number.isFinite(sn) ? sn : null,
      client_name: name,
      client_phone: phone,
      policy_number: policyNumber || null,
      policy_type: policyType,
      mode,
      start_date: startDate,
      renewal_date: renewalDate,
      premium,
      sum_insured: sumInsured,
      product_name: null,
      client_address: null,
    },
  };
}

/**
 * Parse the full register text into rows. Robust to wrapped fields and junk.
 * Only rows with a policy number are returned.
 */
export function parseRegister(text: string): RegisterRow[] {
  const tokens = tokenize(text);
  const rows: RegisterRow[] = [];

  // Find every record start; each record ends where the next one begins.
  const starts: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (isRecordStart(tokens, i)) starts.push(i);
  }

  for (let s = 0; s < starts.length; s++) {
    const start = starts[s];
    const end = s + 1 < starts.length ? starts[s + 1] : tokens.length;
    const { row } = parseRecord(tokens, start, end);
    if (row.policy_number) rows.push(row);
  }
  return rows;
}
