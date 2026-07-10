import { readFileSync } from 'fs';
import { parseERegister } from './src/lib/eregister-parser';
import { homedir } from 'os';
import { join } from 'path';

async function comparePDFs() {
  const originalPath = join(homedir(), 'Downloads', 'example.pdf');
  const compressedPath = join(homedir(), 'Downloads', 'example_compressed.pdf');
  
  console.log('📄 Testing example.pdf...');
  const originalBuffer = readFileSync(originalPath);
  const originalPolicies = await parseERegister(originalBuffer);
  
  console.log('\n📄 Testing example_compressed.pdf...');
  const compressedBuffer = readFileSync(compressedPath);
  const compressedPolicies = await parseERegister(compressedBuffer);
  
  console.log('\n' + '='.repeat(100));
  console.log('COMPARISON RESULTS:');
  console.log('='.repeat(100));
  console.log(`Original PDF:    ${originalPolicies.length} policies extracted`);
  console.log(`Compressed PDF:  ${compressedPolicies.length} policies extracted`);
  console.log(`Difference:      ${Math.abs(originalPolicies.length - compressedPolicies.length)} policies ${originalPolicies.length > compressedPolicies.length ? 'LOST' : 'gained'}`);
  
  // Compare first 5 records
  console.log('\n📋 First 5 records from ORIGINAL:');
  originalPolicies.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. ${p.client_name} | ${p.product_name} | ${p.policy_type}`);
    console.log(`   Premium: ₹${p.premium} | Dates: ${p.start_date} → ${p.renewal_date}`);
  });
  
  console.log('\n📋 First 5 records from COMPRESSED:');
  compressedPolicies.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. ${p.client_name} | ${p.product_name} | ${p.policy_type}`);
    console.log(`   Premium: ₹${p.premium} | Dates: ${p.start_date} → ${p.renewal_date}`);
  });
  
  // Check for 2025/2026 renewals
  const renewals2025 = compressedPolicies.filter(p => p.renewal_date?.startsWith('2025')).length;
  const renewals2026 = compressedPolicies.filter(p => p.renewal_date?.startsWith('2026')).length;
  
  console.log('\n📅 Renewal Date Distribution (Compressed):');
  console.log(`   2025 renewals: ${renewals2025}`);
  console.log(`   2026 renewals: ${renewals2026}`);
  
  // Sample 2025 renewals
  if (renewals2025 > 0) {
    console.log('\n📋 Sample 2025 renewals (should these be 2026?):');
    compressedPolicies.filter(p => p.renewal_date?.startsWith('2025')).slice(0, 5).forEach(p => {
      console.log(`   ${p.client_name} | ${p.start_date} → ${p.renewal_date}`);
    });
  }
}

comparePDFs().catch(console.error);
