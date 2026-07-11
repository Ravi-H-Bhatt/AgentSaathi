import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function verify() {
  const { parseERegister } = await import('./src/lib/eregister-parser.js');
  const rows = await parseERegister(
    readFileSync(join(homedir(), 'Downloads', 'example_compressed.pdf'))
  );

  console.log('\n══════════════════════════════════════════════════');
  console.log('  E-REGISTER FULL EXTRACTION VERIFICATION');
  console.log('══════════════════════════════════════════════════');
  console.log(`Total rows extracted: ${rows.length}`);

  // Field-completeness stats
  const stat = (fn: (r: any) => boolean) => rows.filter(fn).length;
  const pct = (n: number) => `${((n / rows.length) * 100).toFixed(1)}%`;

  const withName = stat((r) => r.client_name && r.client_name.trim());
  const withProduct = stat((r) => r.product_name);
  const withType = stat((r) => r.policy_type);
  const withPolicyNum = stat((r) => r.policy_number);
  const withStart = stat((r) => r.start_date);
  const withRenewal = stat((r) => r.renewal_date);
  const withPremium = stat((r) => r.premium && r.premium > 0);

  console.log('\n── FIELD COMPLETENESS ──');
  console.log(`Client name:   ${withName}/${rows.length}  (${pct(withName)})`);
  console.log(`Company:       ${withProduct}/${rows.length}  (${pct(withProduct)})`);
  console.log(`Policy type:   ${withType}/${rows.length}  (${pct(withType)})`);
  console.log(`Policy number: ${withPolicyNum}/${rows.length}  (${pct(withPolicyNum)})`);
  console.log(`Start date:    ${withStart}/${rows.length}  (${pct(withStart)})`);
  console.log(`Renewal date:  ${withRenewal}/${rows.length}  (${pct(withRenewal)})`);
  console.log(`Premium:       ${withPremium}/${rows.length}  (${pct(withPremium)})`);

  // First & last
  console.log('\n── ORDER CHECK ──');
  console.log(`First: ${rows[0]?.client_name}`);
  console.log(`Last:  ${rows[rows.length - 1]?.client_name}`);

  // ARTH check
  const arth = rows.filter((r) => (r.client_name || '').toUpperCase().includes('ARTH AIR'));
  console.log(`\n── ARTH AIR TECHNOLOGIES ──  (found ${arth.length})`);
  arth.forEach((r, i) =>
    console.log(`${i + 1}. ${r.client_name} | ${r.product_name} | ${r.policy_number || 'no#'} | ₹${r.premium} | ${r.renewal_date}`)
  );

  // Rows missing company (product_name) — the PDF reported issue
  const noCompany = rows.filter((r) => !r.product_name);
  console.log(`\n── ROWS MISSING COMPANY: ${noCompany.length} ──`);
  noCompany.slice(0, 10).forEach((r, i) =>
    console.log(`${i + 1}. ${r.client_name} | type:${r.policy_type} | ${r.policy_number || 'no#'}`)
  );

  // Sample 5 fully-populated rows
  console.log('\n── SAMPLE ROWS ──');
  rows.slice(0, 5).forEach((r, i) =>
    console.log(`${i + 1}. ${r.client_name} | ${r.product_name} | ${r.policy_type} | ${r.policy_number || 'no#'} | ${r.start_date}→${r.renewal_date} | ₹${r.premium}`)
  );
}

verify().catch(console.error);
