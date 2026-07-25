import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { parseTransactionReportExcel } from "./src/lib/transaction-report-excel";
import { normalizePolicyNumber } from "./src/lib/policyNumber";

async function main() {
  const excelPath = join(homedir(), "Downloads", "M080 BUSINESS DETAILS 1 JAN TO 31 DEC 3.xlsx");
  const pdfPath = join(homedir(), "Downloads", "AgentSaathi_book_of_business (3).pdf");
  const rows = parseTransactionReportExcel(readFileSync(excelPath));

  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(readFileSync(pdfPath)));
  const { text } = await extractText(doc, { mergePages: true });
  const pdfText: string = Array.isArray(text) ? text.join("\n") : text;
  const pdfLower = pdfText.toLowerCase();

  const blanks = rows.filter((r) => !normalizePolicyNumber(r.policy_number));

  // How many blank rows carry sum_insured / product_name (fields the DB records have but Excel omits)?
  let hasSum = 0, hasProd = 0, hasStart = 0;
  for (const r of blanks) {
    if (r.sum_insured != null) hasSum++;
    if (r.product_name) hasProd++;
    if (r.start_date) hasStart++;
  }
  console.log(`blank rows: ${blanks.length}`);
  console.log(`  with sum_insured   : ${hasSum}`);
  console.log(`  with product_name  : ${hasProd}`);
  console.log(`  with start_date    : ${hasStart}`);

  // Weak duplicate signal: name loosely present AND premium value present in book.
  const money = (n: number|null) => n==null ? null : Number(n).toLocaleString("en-IN");
  let bothPresent = 0;
  const likelyNew: string[] = [];
  for (const r of blanks) {
    const tokens = (r.client_name||"").toLowerCase().split(/\s+/).filter(Boolean);
    const fl = tokens.length>=2 ? new RegExp(`${tokens[0]}.{0,40}${tokens[tokens.length-1]}`) : null;
    const nameOk = fl ? fl.test(pdfLower) : pdfLower.includes(tokens[0]||"");
    const prem = money(r.premium);
    const premOk = prem ? pdfLower.includes(prem.toLowerCase()) : false;
    if (nameOk && premOk) bothPresent++;
    else if (likelyNew.length < 20) likelyNew.push(`${r.client_name} | ${r.company} | ${r.policy_type} | prem=${r.premium}`);
  }
  console.log(`\n  blank rows where BOTH name & premium appear in book (likely already stored): ${bothPresent}`);
  console.log(`  blank rows likely genuinely new: ${blanks.length - bothPresent}`);
  console.log("\n--- sample 'likely new' blank rows ---");
  likelyNew.forEach(e=>console.log("  "+e));
}
main().catch(console.error);
