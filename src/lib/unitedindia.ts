import type { RegisterRow } from "@/lib/types";

/**
 * PARSER: United India Insurance "Premium Register"
 *
 * Clean, linear text layer. Each policy row (flattened) looks like:
 *   1 060000 9060500 0605002825P115623759 0 07/01/2026 PRAVIN K.TRIVEDI
 *   31 Jan 2026 30 Jan 2027 Health 300000.00 0.00 24604 RO AHMEDABAD ...
 *
 * Columns (row 1): S.NO, RO Code, Office Code, Policy Number, Endorsement,
 *   Collection Date, Insured Name, Policy Effective Date, Policy Expiry Date,
 *   Department, Sum Insured, TP Premium, OD (own-damage premium).
 *
 * We anchor on the distinctive policy number (10 digits + "P" + 9 digits),
 * which makes extraction robust across page breaks.
 *
 * Premium is intentionally NOT captured for this report (it is split across
 * TP Premium + OD columns and not requested), so premium is left null.
 */

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** "31 Jan 2026" / "1 Feb 2026" -> "2026-01-31" */
function isoFromDMonY(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!m) return null;
  const mm = MONTHS[m[2].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
}

/** "300000.00" / "15,000.00" -> 300000 ; blank -> null */
function money(s: string | undefined): number | null {
  if (s == null) return null;
  const c = s.replace(/,/g, "").trim();
  if (!c) return null;
  const v = parseFloat(c);
  return isNaN(v) ? null : Math.round(v);
}

/** Detect a United India Insurance Premium Register. */
export function looksLikeUnitedIndiaRegister(text: string): boolean {
  const head = text.slice(0, 4000);
  return (
    /united\s+india\s+insurance/i.test(head) &&
    /premium\s+register/i.test(head)
  );
}

/** Parse the United India Premium Register into rows. */
export function parseUnitedIndiaRegister(text: string): RegisterRow[] {
  const t = text.replace(/\s+/g, " ");
  const rows: RegisterRow[] = [];

  //  policyNo  endorsement  collectionDate  insuredName  effDate  expDate
  //    department  sumInsured  tpPremium  odPremium
  // Note: some names end with a period and are glued to the effective date with
  // no space (e.g. "...SHAH5 Feb 2026"), so we allow zero spaces (\s*) between
  // the insured name and the first date.
  const re =
    /(\d{10}P\d{9})\s+\d+\s+\d{2}\/\d{2}\/\d{4}\s+(.+?)\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+([A-Za-z][A-Za-z ]*?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(\d+)/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const policy = m[1];
    const name = m[2].replace(/\s+/g, " ").trim();
    const eff = m[3];
    const exp = m[4];
    const dept = m[5].replace(/\s+/g, " ").trim();
    const si = money(m[6]);

    rows.push({
      sn: null,
      client_name: name || null,
      client_phone: null,
      client_address: null,
      company: "United India",
      policy_number: policy,
      policy_type: dept || null,
      product_name: null,
      mode: null,
      start_date: isoFromDMonY(eff),
      renewal_date: isoFromDMonY(exp),
      premium: null, // premium intentionally not captured for this report
      sum_insured: si ?? 0,
    });
  }

  return rows;
}
