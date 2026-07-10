import { readFileSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function check() {
  const { parseNewIndiaRegisterFast } = await import('./src/lib/newindia-fast.js');
  const { parseERegister } = await import('./src/lib/eregister-parser.js');
  const dir = join(homedir(), 'Downloads');

  const newPdfs = readdirSync(dir).filter(f =>
    f.toUpperCase().startsWith('NEW') && f.toLowerCase().endsWith('.pdf')
  );

  const all: any[] = [];

  for (const f of newPdfs) {
    const pols = await parseNewIndiaRegisterFast(readFileSync(join(dir, f)));
    pols.forEach(p => all.push({ src: f, ...p }));
  }
  const ereg = await parseERegister(readFileSync(join(dir, 'example_compressed.pdf')));
  ereg.forEach(p => all.push({ src: 'example_compressed.pdf', ...p }));

  console.log('\n═══════════════════════════════════════');
  console.log('  PREMIUM SANITY CHECK');
  console.log('═══════════════════════════════════════');
  console.log(`Total policies: ${all.length}`);

  // Find abnormally large premiums (> 10 lakh is suspicious for a premium)
  const huge = all
    .filter(p => (p.premium || 0) > 1000000)
    .sort((a, b) => (b.premium || 0) - (a.premium || 0));

  console.log(`\n🔴 Premiums > ₹10,00,000 (suspicious): ${huge.length}`);
  huge.slice(0, 20).forEach(p => {
    console.log(`  ₹${p.premium?.toLocaleString('en-IN')} | ${p.client_name} | ${p.product_name} | renewal:${p.renewal_date} | ${p.src}`);
  });

  // Total premium
  const totalPrem = all.reduce((s, p) => s + (p.premium || 0), 0);
  console.log(`\nTotal premium (all): ₹${totalPrem.toLocaleString('en-IN')}`);
  console.log(`In Cr: ${(totalPrem / 10000000).toFixed(2)} Cr`);

  // January renewals
  const jan = all.filter(p => {
    if (!p.renewal_date) return false;
    const d = new Date(p.renewal_date);
    return !isNaN(d.getTime()) && d.getMonth() === 0;
  });
  const janPrem = jan.reduce((s, p) => s + (p.premium || 0), 0);
  console.log(`\nJanuary renewals: ${jan.length}, premium: ₹${janPrem.toLocaleString('en-IN')} (${(janPrem/10000000).toFixed(2)} Cr)`);

  // Biggest Jan premiums
  console.log('\nBiggest January premiums:');
  jan.sort((a,b)=>(b.premium||0)-(a.premium||0)).slice(0,10).forEach(p => {
    console.log(`  ₹${p.premium?.toLocaleString('en-IN')} | ${p.client_name} | ${p.product_name} | ${p.renewal_date} | ${p.src}`);
  });
}

check().catch(console.error);
