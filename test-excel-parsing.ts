import * as XLSX from 'xlsx';
import { parseUnitedIndiaExcel } from './src/lib/united-india-excel';
import * as fs from 'fs';

// Test with the first Excel file
const testFile = '/Users/ravib/Downloads/1784152793166-New_Microsoft_Excel_Worksheet__2_.xlsx';

if (!fs.existsSync(testFile)) {
  console.error('Test file not found:', testFile);
  process.exit(1);
}

const buffer = fs.readFileSync(testFile);
console.log('🔍 Testing United India Excel parser...\n');

try {
  const rows = parseUnitedIndiaExcel(buffer);
  
  if (rows.length === 0) {
    console.log('❌ NO ROWS PARSED - Parser returned empty array');
    process.exit(1);
  }
  
  console.log(`✅ Parsed ${rows.length} rows\n`);
  
  // Show first 3 rows with all fields
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const row = rows[i];
    console.log(`📋 Row ${i + 1}:`);
    console.log(`   Client Name:      ${row.client_name}`);
    console.log(`   Policy Number:    ${row.policy_number}`);
    console.log(`   Company:          ${row.company}`);
    console.log(`   Product Name:     ${row.product_name}`);
    console.log(`   Policy Type:      ${row.policy_type}`);
    console.log(`   Policy Holder:    ${row.policy_holder_type}`);
    console.log(`   Premium:          ${row.premium}`);
    console.log(`   Sum Insured:      ${row.sum_insured}`);
    console.log(`   Mode:             ${row.mode}`);
    console.log(`   Start Date:       ${row.start_date}`);
    console.log(`   Renewal Date:     ${row.renewal_date}`);
    console.log();
  }
  
  // Check if Company field is set for all rows
  const withoutCompany = rows.filter(r => !r.company).length;
  if (withoutCompany > 0) {
    console.log(`⚠️  WARNING: ${withoutCompany}/${rows.length} rows missing company field`);
  } else {
    console.log(`✅ All ${rows.length} rows have company field set`);
  }
  
  // Check if Product field is set for all rows
  const withoutProduct = rows.filter(r => !r.product_name).length;
  if (withoutProduct > 0) {
    console.log(`⚠️  WARNING: ${withoutProduct}/${rows.length} rows missing product_name field`);
  } else {
    console.log(`✅ All ${rows.length} rows have product_name field set`);
  }
  
  // Check if Mode field is set for all rows
  const withoutMode = rows.filter(r => !r.mode).length;
  if (withoutMode > 0) {
    console.log(`⚠️  WARNING: ${withoutMode}/${rows.length} rows missing mode field`);
  } else {
    console.log(`✅ All ${rows.length} rows have mode field set`);
  }
  
} catch (err) {
  console.error('❌ Error parsing Excel:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}
