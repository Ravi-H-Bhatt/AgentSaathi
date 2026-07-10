import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function analyze() {
  const { parseERegister } = await import('./src/lib/eregister-parser.js');
  const buffer = readFileSync(join(homedir(), 'Downloads', 'example_compressed.pdf'));
  const policies = await parseERegister(buffer);

  const byNum = new Map<string, any[]>();
  policies.forEach(p => {
    if (p.policy_number) {
      const e = byNum.get(p.policy_number) || [];
      e.push(p);
      byNum.set(p.policy_number, e);
    }
  });

  const dups = Array.from(byNum.entries()).filter(([_, p]) => p.length > 1);
  
  console.log(`\nTotal duplicate policy#: ${dups.length}\n`);
  
  let trueDupes = 0;  // Exactly same everything
  let diffDupes = 0;  // Same policy# but different data
  
  dups.forEach(([num, pols]) => {
    // Check if ALL fields are identical
    const first = pols[0];
    const allSame = pols.every(p => 
      p.client_name === first.client_name &&
      p.product_name === first.product_name &&
      p.premium === first.premium &&
      p.renewal_date === first.renewal_date &&
      p.start_date === first.start_date
    );
    
    if (allSame) trueDupes++;
    else diffDupes++;
  });
  
  console.log(`✓ TRUE duplicates (identical everything): ${trueDupes}`);
  console.log(`✗ DIFFERENT data (same policy# only): ${diffDupes}\n`);
  
  console.log('DIFFERENT DATA EXAMPLES (should be kept separate):');
  console.log('═══════════════════════════════════════════════════');
  dups.forEach(([num, pols]) => {
    const first = pols[0];
    const allSame = pols.every(p => 
      p.client_name === first.client_name &&
      p.product_name === first.product_name &&
      p.premium === first.premium &&
      p.renewal_date === first.renewal_date
    );
    if (!allSame) {
      console.log(`\nPolicy #${num}:`);
      pols.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.client_name} | ${p.product_name} | ₹${p.premium} | ${p.renewal_date}`);
      });
    }
  });
}

analyze().catch(console.error);
