import { readFileSync } from 'fs';
import { parseUnitedIndiaExcel } from './src/lib/united-india-excel';

const buffer = readFileSync('/Users/ravib/Downloads/New Microsoft Excel Worksheet (2).xlsx');
const rows = parseUnitedIndiaExcel(buffer);

console.log(`\n✓ Parsed ${rows.length} policies\n`);

// Show first 3
rows.slice(0, 3).forEach((r, i) => {
  console.log(`[${i + 1}] ${r.client_name}`);
  console.log(`    Policy: ${r.policy_number}`);
  console.log(`    Company: ${r.company}`);
  console.log(`    Type: ${r.policy_type}`);
  console.log(`    Holder Type: ${r.policy_holder_type}`);
  console.log(`    Renewal: ${r.renewal_date}`);
  console.log(`    Premium: ${r.premium ? '₹' + r.premium.toLocaleString('en-IN') : 'N/A'}`);
  console.log('');
});

console.log(`Total Premium: ₹${rows.reduce((sum, r) => sum + (r.premium || 0), 0).toLocaleString('en-IN')}`);
