import { readFileSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function findDuplicates() {
  const { parseNewIndiaRegisterFast } = await import('./src/lib/newindia-fast.js');
  const { parseERegister } = await import('./src/lib/eregister-parser.js');
  
  const downloadsDir = join(homedir(), 'Downloads');
  
  // Find all New India PDFs (NEW*.pdf)
  const allFiles = readdirSync(downloadsDir);
  const newIndiaPdfs = allFiles.filter(f => 
    f.toUpperCase().startsWith('NEW') && f.toLowerCase().endsWith('.pdf')
  ).sort();
  
  console.log('\n🔍 SCANNING ALL PDFS FOR DUPLICATES');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log(`Found ${newIndiaPdfs.length} New India PDFs:`);
  newIndiaPdfs.forEach(f => console.log(`  - ${f}`));
  console.log('\n');
  
  // Extract all policies from all PDFs
  const allPolicies: any[] = [];
  
  // Process New India PDFs
  for (const filename of newIndiaPdfs) {
    try {
      const buffer = readFileSync(join(downloadsDir, filename));
      const policies = await parseNewIndiaRegisterFast(buffer);
      console.log(`✓ ${filename}: ${policies.length} policies`);
      
      policies.forEach(p => {
        allPolicies.push({
          source: filename,
          policy_number: p.policy_number,
          client_name: p.client_name,
          product_name: p.product_name,
          premium: p.premium,
          start_date: p.start_date,
          renewal_date: p.renewal_date,
        });
      });
    } catch (e) {
      console.log(`✗ ${filename}: ERROR - ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }
  
  // Process E-Register PDF
  try {
    const eregBuffer = readFileSync(join(downloadsDir, 'example_compressed.pdf'));
    const eregPolicies = await parseERegister(eregBuffer);
    console.log(`✓ example_compressed.pdf: ${eregPolicies.length} policies`);
    
    eregPolicies.forEach(p => {
      allPolicies.push({
        source: 'example_compressed.pdf',
        policy_number: p.policy_number,
        client_name: p.client_name,
        product_name: p.product_name,
        premium: p.premium,
        start_date: p.start_date,
        renewal_date: p.renewal_date,
      });
    });
  } catch (e) {
    console.log(`✗ example_compressed.pdf: ERROR - ${e instanceof Error ? e.message : 'unknown'}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`\n📊 TOTAL POLICIES EXTRACTED: ${allPolicies.length}`);
  
  // Find duplicates by policy_number
  const policyNumberMap = new Map<string, any[]>();
  
  allPolicies.forEach(p => {
    if (p.policy_number) {
      const existing = policyNumberMap.get(p.policy_number) || [];
      existing.push(p);
      policyNumberMap.set(p.policy_number, existing);
    }
  });
  
  // Find policy numbers that appear in multiple PDFs
  const duplicates = Array.from(policyNumberMap.entries())
    .filter(([_, policies]) => policies.length > 1);
  
  console.log(`\n🔴 DUPLICATE POLICY NUMBERS: ${duplicates.length}`);
  console.log('═══════════════════════════════════════════════════\n');
  
  if (duplicates.length > 0) {
    console.log('First 20 duplicates:\n');
    duplicates.slice(0, 20).forEach(([policyNum, policies]) => {
      console.log(`Policy #${policyNum}:`);
      policies.forEach(p => {
        console.log(`  ├─ ${p.source}`);
        console.log(`  │  Client: ${p.client_name}`);
        console.log(`  │  Product: ${p.product_name || 'N/A'}`);
        console.log(`  │  Premium: ₹${p.premium || 'N/A'}`);
        console.log(`  │  Renewal: ${p.renewal_date || 'N/A'}`);
      });
      console.log('');
    });
    
    if (duplicates.length > 20) {
      console.log(`... and ${duplicates.length - 20} more duplicates\n`);
    }
  } else {
    console.log('✅ NO DUPLICATES FOUND - All policy numbers are unique!\n');
  }
  
  // Check for policies without policy numbers
  const withoutNumbers = allPolicies.filter(p => !p.policy_number);
  console.log(`\n📝 Policies WITHOUT policy numbers: ${withoutNumbers.length}`);
  console.log('(These cannot be deduplicated and will all be imported)\n');
  
  // Summary
  const uniquePolicyNumbers = new Set(
    allPolicies.filter(p => p.policy_number).map(p => p.policy_number)
  ).size;
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📈 FINAL SUMMARY:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Total policies extracted: ${allPolicies.length}`);
  console.log(`Unique policy numbers: ${uniquePolicyNumbers}`);
  console.log(`Policies without numbers: ${withoutNumbers.length}`);
  console.log(`Duplicate policy numbers: ${duplicates.length}`);
  console.log(`\nExpected DB count: ${uniquePolicyNumbers + withoutNumbers.length}`);
  console.log('═══════════════════════════════════════════════════\n');
}

findDuplicates().catch(console.error);
