import { readFileSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function rowKey(r: any): string {
  return [
    (r.policy_number || "").trim().toLowerCase(),
    nameKey(r.client_name || ""),
    (r.product_name || "").trim().toLowerCase(),
    (r.policy_type || "").trim().toLowerCase(),
    r.premium ?? "",
    r.sum_insured ?? "",
    r.start_date || "",
    r.renewal_date || "",
  ].join("|");
}

async function verify() {
  const { parseNewIndiaRegisterFast } = await import('./src/lib/newindia-fast.js');
  const { parseERegister } = await import('./src/lib/eregister-parser.js');
  const dir = join(homedir(), 'Downloads');
  
  const newPdfs = readdirSync(dir).filter(f => 
    f.toUpperCase().startsWith('NEW') && f.toLowerCase().endsWith('.pdf')
  );
  
  const allKeys = new Set<string>();
  let newIndiaTotal = 0;
  let eregTotal = 0;
  
  for (const f of newPdfs) {
    const buf = readFileSync(join(dir, f));
    const pols = await parseNewIndiaRegisterFast(buf);
    newIndiaTotal += pols.length;
    pols.forEach(p => allKeys.add(rowKey(p)));
  }
  
  const eregBuf = readFileSync(join(dir, 'example_compressed.pdf'));
  const eregPols = await parseERegister(eregBuf);
  eregTotal = eregPols.length;
  eregPols.forEach(p => allKeys.add(rowKey(p)));
  
  console.log('\n═══════════════════════════════════════');
  console.log('📊 COMPOSITE KEY DEDUP RESULTS');
  console.log('═══════════════════════════════════════');
  console.log(`New India total: ${newIndiaTotal}`);
  console.log(`E-Register total: ${eregTotal}`);
  console.log(`Raw total: ${newIndiaTotal + eregTotal}`);
  console.log(`\n✅ UNIQUE policies (composite key): ${allKeys.size}`);
  console.log(`Exact duplicates removed: ${(newIndiaTotal + eregTotal) - allKeys.size}`);
  console.log('═══════════════════════════════════════\n');
}

verify().catch(console.error);
