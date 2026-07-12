import type { RegisterRow } from "@/lib/types";

/**
 * PARSER: New India single "Policy Schedule" / certificate PDF.
 *
 * This is an individual policy document (not a register). It carries both the
 * Current Policy No and the Previous Policy No, which lets us map a renewal to
 * the client who already holds the previous policy.
 *
 * We extract deterministically from the (clean) text layer.
 */

/** "31/03/2026" -> "2026-03-31" */
function isoFromDMY(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function money(s: string | undefined): number | null {
  if (s == null) return null;
  const c = s.replace(/,/g, "").trim();
  if (!/^\d+$/.test(c)) return null;
  return parseInt(c, 10);
}

/** Detect a New India single Policy Schedule document. */
export function looksLikeNewIndiaPolicySchedule(text: string): boolean {
  const head = text.slice(0, 6000);
  return (
    /policy\s*schedule/i.test(head) &&
    /current\s*policy\s*no/i.test(head) &&
    /previous\s*policy\s*no/i.test(head) &&
    /new\s*india/i.test(head)
  );
}

/**
 * Parse a New India Policy Schedule into a single RegisterRow, capturing the
 * previous policy number so it can be mapped to an existing client on import.
 */
export function parseNewIndiaPolicySchedule(text: string): RegisterRow[] {
  const t = text.replace(/\s+/g, " ").trim();

  const currentPolicy =
    t.match(/Current\s*Policy\s*No\s*:?\s*(\d{18,22})/i)?.[1] || null;
  if (!currentPolicy) return [];

  const previousPolicy =
    t.match(/Previous\s*Policy\s*No\s*:?\s*(\d{18,22})/i)?.[1] || null;

  // Current Policy Period From:31/03/2026 ... To:30/03/2027
  const period = t.match(
    /Current\s*Policy\s*Period\s*From:\s*(\d{2}\/\d{2}\/\d{4}).*?To:\s*(\d{2}\/\d{2}\/\d{4})/i
  );
  const startDate = isoFromDMY(period?.[1]);
  const renewalDate = isoFromDMY(period?.[2]);

  // Policyholder Name ... Customer ID
  const name =
    t.match(/Policyholder\s*Name\s+(.+?)\s+Customer\s*ID/i)?.[1]?.trim() ||
    null;

  // Product name, e.g. "New India Floater Mediclaim Policy" (before "UIN :")
  const product =
    t.match(/(New India[A-Za-z ]+?Policy)\s+UIN/i)?.[1]?.trim() || null;

  // Floater Sum Insured 800000  (fallback: any "Sum Insured 800000")
  const sumInsured =
    money(t.match(/Floater\s*Sum\s*Insured\s+([\d,]+)/i)?.[1]) ??
    money(t.match(/\bSum\s*Insured\s+([\d,]+)/i)?.[1]);

  // Net Premium(With GST) 30040  (fallback: Total Gross Premium(Without GST))
  const premium =
    money(t.match(/Net\s*Premium\s*\(With\s*GST\)\s+([\d,]+)/i)?.[1]) ??
    money(t.match(/Total\s*Gross\s*Premium\s*\(Without\s*GST\)\s+([\d,]+)/i)?.[1]);

  // Address: Policyholder's address ... Email id
  let address =
    t.match(/Policyholder'?s?\s*address\s+(.+?)\s+Email\s*id/i)?.[1]?.trim() ||
    null;
  if (address) address = address.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").trim();

  const lob = t.match(/(\d{2})\s+Health\s+Insurance/i)?.[0] || null;

  return [
    {
      sn: null,
      client_name: name,
      client_phone: null, // phone is masked (XXXXXXX3163) in schedules
      client_address: address,
      company: "New India",
      policy_number: currentPolicy,
      previous_policy_number: previousPolicy,
      policy_type: lob || null,
      product_name: product,
      mode: null,
      start_date: startDate,
      renewal_date: renewalDate,
      premium,
      sum_insured: sumInsured ?? 0,
    },
  ];
}
