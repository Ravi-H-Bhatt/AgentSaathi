import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// EXACT rowKey logic from the bulk route
function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
function numKey(n: any): string {
  if (n == null || n === "") return "";
  const v = Number(n);
  return isNaN(v) ? "" : String(v);
}
function dateKey(d: any): string {
  return d ? String(d).slice(0, 10) : "";
}
function rowKey(r: any): string {
  return [
    (r.policy_number || "").trim().toLowerCase(),
    nameKey(r.client_name || ""),
    (r.product_name || "").trim().toLowerCase(),
    (r.policy_type || "").trim().toLowerCase(),
    numKey(r.premium),
    numKey(r.sum_insured),
    dateKey(r.start_date),
    dateKey(r.renewal_date),
  ].join("|");
}

// Simulate the import: given current DB keys + incoming rows,
// return how many are NEW (added) using composite dedup.
function simulateImport(dbKeys: Set<string>, rows: any[]) {
  const seenInFile = new Set<string>();
  let added = 0;
  for (const r of rows) {
    const k = rowKey(r);
    if (dbKeys.has(k) || seenInFile.has(k)) continue;
    seenInFile.add(k);
    dbKeys.add(k); // store it
    added++;
  }
  return added;
}

async function test() {
  const { parseERegister } = await import('./src/lib/eregister-parser.js');
  const rows = await parseERegister(
    readFileSync(join(homedir(), 'Downloads', 'example_compressed.pdf'))
  );

  const uniqueKeys = new Set(rows.map(rowKey));

  console.log('\n═══════════════════════════════════════════');
  console.log('  EXAMPLE_COMPRESSED.PDF — RE-UPLOAD TEST');
  console.log('═══════════════════════════════════════════');
  console.log(`Total rows parsed:        ${rows.length}`);
  console.log(`Unique (composite) rows:  ${uniqueKeys.size}`);
  console.log(`Exact duplicate rows:     ${rows.length - uniqueKeys.size}`);

  // ---- SCENARIO 1: Fresh import into empty DB ----
  const db1 = new Set<string>();
  const added1 = simulateImport(db1, rows);
  console.log('\n── Scenario 1: import into EMPTY db ──');
  console.log(`Added:      ${added1}`);
  console.log(`DB total:   ${db1.size}`);

  // ---- SCENARIO 2: Re-upload the SAME pdf (must add 0) ----
  const added2 = simulateImport(db1, rows);
  console.log('\n── Scenario 2: RE-UPLOAD same pdf ──');
  console.log(`Added:      ${added2}  (MUST be 0 — no doubling)`);
  console.log(`DB total:   ${db1.size}  (unchanged)`);

  // ---- SCENARIO 3: Partial DB (only first 100 saved), then re-upload ----
  const db3 = new Set<string>();
  // pretend only first 100 rows got saved last time
  simulateImport(db3, rows.slice(0, 100));
  console.log('\n── Scenario 3: only 100 saved before, now re-upload full pdf ──');
  console.log(`DB before re-upload: ${db3.size}`);
  const added3 = simulateImport(db3, rows);
  console.log(`Added on re-upload:  ${added3}  (the remaining missing ones)`);
  console.log(`DB total after:      ${db3.size}  (should equal ${uniqueKeys.size})`);

  console.log('\n═══════════════════════════════════════════');
  const pass = added2 === 0 && db1.size === uniqueKeys.size && db3.size === uniqueKeys.size;
  console.log(pass ? '✅ ALL CHECKS PASSED — no doubling, all unique stored' : '❌ CHECK FAILED');
  console.log('═══════════════════════════════════════════\n');
}

test().catch(console.error);
