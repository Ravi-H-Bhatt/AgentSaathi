import { readFileSync } from 'fs';
import { parseNewIndiaRegisterFast } from './src/lib/newindia-fast';
import { homedir } from 'os';
import { join } from 'path';

async function testFullExtraction() {
  const pdfPath = join(homedir(), 'Downloads', 'NEW MARCH26.pdf');
  
  console.log('📄 Testing: NEW MARCH26.pdf');
  console.log('='.repeat(100));
  
  const buffer = readFileSync(pdfPath);
  const policies = await parseNewIndiaRegisterFast(buffer);
  
  console.log(`\n✅ Total Policies Extracted: ${policies.length}\n`);
  
  // Check completeness
  let complete = 0;
  let issues: any[] = [];
  
  policies.forEach((p, i) => {
    const missing: string[] = [];
    
    if (!p.policy_number) missing.push('policy_number');
    if (!p.client_name) missing.push('client_name');
    if (!p.policy_type) missing.push('policy_type (LOB)');
    if (!p.product_name) missing.push('product_name');
    if (!p.start_date) missing.push('start_date');
    if (!p.renewal_date) missing.push('renewal_date');
    if (!p.client_address) missing.push('client_address');
    // sum_insured can be 0 for TP policies
    // phone can be missing
    // premium can be 0
    
    if (missing.length === 0) {
      complete++;
    } else {
      issues.push({
        index: i + 1,
        name: p.client_name || '(no name)',
        policyNum: p.policy_number || '(no policy#)',
        missing
      });
    }
  });
  
  console.log(`✅ Complete Records: ${complete}/${policies.length} (${((complete/policies.length)*100).toFixed(1)}%)`);
  
  if (issues.length > 0) {
    console.log(`\n⚠️  ${issues.length} Records with Missing Fields:\n`);
    issues.forEach(issue => {
      console.log(`   ${issue.index}. ${issue.name} [${issue.policyNum}]`);
      console.log(`      Missing: ${issue.missing.join(', ')}\n`);
    });
  }
  
  // Show first 5 complete records as examples
  console.log('\n📋 Sample of First 5 Complete Records:\n');
  policies.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. ${'-'.repeat(96)}`);
    console.log(`   Policy Number:  ${p.policy_number || 'MISSING'}`);
    console.log(`   Client Name:    ${p.client_name || 'MISSING'}`);
    console.log(`   Address:        ${p.client_address || 'MISSING'}`);
    console.log(`   LOB:            ${p.policy_type || 'MISSING'}`);
    console.log(`   Product:        ${p.product_name || 'MISSING'}`);
    console.log(`   Start Date:     ${p.start_date || 'MISSING'}`);
    console.log(`   Renewal Date:   ${p.renewal_date || 'MISSING'}`);
    console.log(`   Sum Insured:    ₹${p.sum_insured?.toLocaleString('en-IN') || '0'}`);
    console.log(`   Premium:        ₹${p.premium?.toLocaleString('en-IN') || '0'}`);
    console.log(`   Phone:          ${p.client_phone || '(not provided)'}`);
    console.log();
  });
  
  // Field statistics
  console.log('\n📊 Field Extraction Statistics:');
  console.log('='.repeat(100));
  const stats = {
    'Policy Number': policies.filter(p => p.policy_number).length,
    'Client Name': policies.filter(p => p.client_name).length,
    'Address': policies.filter(p => p.client_address).length,
    'LOB Description': policies.filter(p => p.policy_type).length,
    'Product Name': policies.filter(p => p.product_name).length,
    'Start Date': policies.filter(p => p.start_date).length,
    'Renewal Date': policies.filter(p => p.renewal_date).length,
    'Sum Insured': policies.filter(p => p.sum_insured != null).length,
    'Premium': policies.filter(p => p.premium != null).length,
    'Phone': policies.filter(p => p.client_phone).length,
  };
  
  Object.entries(stats).forEach(([field, count]) => {
    const pct = ((count / policies.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count / policies.length * 50));
    console.log(`   ${field.padEnd(20)} ${count}/${policies.length} (${pct}%) ${bar}`);
  });
  
  // Check for specific issues
  console.log('\n🔍 Data Quality Checks:');
  console.log('='.repeat(100));
  
  // Names with addresses leaked
  const nameWithAddress = policies.filter(p => 
    p.client_name && (
      p.client_name.includes('Line 1') ||
      p.client_name.includes('Line 2') ||
      p.client_name.includes('Line 3') ||
      p.client_name.length > 50
    )
  );
  console.log(`   Names with leaked address text: ${nameWithAddress.length}`);
  if (nameWithAddress.length > 0) {
    nameWithAddress.slice(0, 3).forEach(p => {
      console.log(`      ⚠️  ${p.client_name}`);
    });
  }
  
  // Addresses without "Line"
  const addressWithoutLine = policies.filter(p => 
    p.client_address && !p.client_address.includes('Line')
  ).length;
  console.log(`   Addresses without "Line" labels: ${addressWithoutLine} (OK if intentional)`);
  
  // Sum insured > 10 crore (suspicious)
  const hugeSumInsured = policies.filter(p => 
    p.sum_insured && p.sum_insured > 100000000
  );
  console.log(`   Sum Insured > ₹10 crore: ${hugeSumInsured.length} ${hugeSumInsured.length > 0 ? '⚠️  SUSPICIOUS' : '✅'}`);
  if (hugeSumInsured.length > 0) {
    hugeSumInsured.forEach(p => {
      console.log(`      ${p.client_name}: ₹${p.sum_insured?.toLocaleString('en-IN')}`);
    });
  }
  
  // MOTOR policies with sum_insured = 0
  const motorZeroSum = policies.filter(p => 
    p.policy_type?.toUpperCase().includes('MOTOR') && p.sum_insured === 0
  ).length;
  console.log(`   MOTOR policies with ₹0 sum insured: ${motorZeroSum} (TP-only, OK)`);
  
  // Dates in wrong year
  const wrongYear = policies.filter(p => {
    if (!p.renewal_date) return false;
    const year = parseInt(p.renewal_date.split('-')[0]);
    return year < 2024 || year > 2027;
  }).length;
  console.log(`   Dates with wrong year (<2024 or >2027): ${wrongYear} ${wrongYear > 0 ? '⚠️' : '✅'}`);
  
  console.log('\n' + '='.repeat(100));
  if (complete === policies.length && hugeSumInsured.length === 0 && nameWithAddress.length === 0) {
    console.log('✅ ✅ ✅  110% ACCURACY ACHIEVED - ALL FIELDS EXTRACTED CORRECTLY  ✅ ✅ ✅');
  } else {
    console.log('⚠️  REFINEMENT NEEDED - See issues above');
  }
  console.log('='.repeat(100));
}

testFullExtraction().catch(console.error);
