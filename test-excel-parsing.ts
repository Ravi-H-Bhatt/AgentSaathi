/**
 * Test Excel Parsing for United India Health Policies
 * 
 * Verifies:
 * - Policy number extraction with /0 suffix removed
 * - All columns parsed correctly
 * - Correct row count
 */

import { readFileSync } from 'fs';
import { parseUnitedIndiaExcel } from './src/lib/united-india-excel';

async function testExcelParsing() {
  try {
    const excelPath = process.argv[2];
    
    if (!excelPath) {
      console.error('❌ Usage: npx tsx test-excel-parsing.ts <path-to-excel-file>');
      process.exit(1);
    }
    
    console.log('📊 Testing United India Excel Parser');
    console.log('━'.repeat(80));
    console.log(`File: ${excelPath}`);
    console.log('');
    
    const buffer = readFileSync(excelPath);
    console.log('✅ Excel file loaded');
    
    const rows = parseUnitedIndiaExcel(buffer);
    
    console.log('');
    console.log(`✅ PARSED ${rows.length} POLICIES`);
    console.log('━'.repeat(80));
    console.log('');
    
    if (rows.length === 0) {
      console.error('❌ No rows parsed!');
      process.exit(1);
    }
    
    // Display summary
    console.log('📋 FIRST 10 POLICIES:');
    console.log('─'.repeat(80));
    
    rows.slice(0, 10).forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.client_name}`);
      console.log(`   Policy Number:    ${row.policy_number}`);
      console.log(`   Insured Type:     ${row.policy_holder_type}`);
      console.log(`   Renewal Date:     ${row.renewal_date}`);
      console.log(`   Premium:          ₹${row.premium ? row.premium.toLocaleString('en-IN') : 'N/A'}`);
      console.log(`   Department:       ${row.policy_type}`);
    });
    
    console.log('\n' + '─'.repeat(80));
    console.log('');
    
    // Validation checks
    console.log('🔍 VALIDATION:');
    console.log('─'.repeat(80));
    
    // Check 1: All policies have numbers
    const allHaveNumbers = rows.every(r => r.policy_number && r.policy_number.length > 0);
    console.log(`${allHaveNumbers ? '✅' : '❌'} All policies have policy numbers`);
    
    // Check 2: No /0 suffix
    const noSlashZero = rows.every(r => !r.policy_number.includes('/0'));
    console.log(`${noSlashZero ? '✅' : '❌'} No "/0" suffix in policy numbers`);
    
    // Check 3: All have client names
    const allHaveNames = rows.every(r => r.client_name && r.client_name.length > 0);
    console.log(`${allHaveNames ? '✅' : '❌'} All policies have client names`);
    
    // Check 4: All have renewal dates
    const allHaveDates = rows.every(r => r.renewal_date && r.renewal_date.length > 0);
    console.log(`${allHaveDates ? '✅' : '❌'} All policies have renewal dates`);
    
    // Check 5: All have premium amounts
    const allHavePremium = rows.every(r => r.premium && r.premium > 0);
    console.log(`${allHavePremium ? '✅' : '❌'} All policies have premium amounts`);
    
    // Check 6: All have insured type
    const allHaveType = rows.every(r => r.policy_holder_type && r.policy_holder_type.length > 0);
    console.log(`${allHaveType ? '✅' : '❌'} All policies have insured type`);
    
    // Check 7: Department is "Health"
    const allHealth = rows.every(r => r.policy_type === 'Health');
    console.log(`${allHealth ? '✅' : '❌'} All policies are Health department`);
    
    console.log('');
    
    // Statistics
    console.log('📊 STATISTICS:');
    console.log('─'.repeat(80));
    console.log(`Total Policies:          ${rows.length}`);
    
    const totalPremium = rows.reduce((sum, r) => sum + (r.premium || 0), 0);
    console.log(`Total Premium:           ₹${totalPremium.toLocaleString('en-IN')}`);
    
    const avgPremium = totalPremium / rows.length;
    console.log(`Average Premium:         ₹${avgPremium.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
    
    const insuredTypes = new Set(rows.map(r => r.policy_holder_type));
    console.log(`Insured Types:           ${Array.from(insuredTypes).join(', ')}`);
    
    const earliestRenewal = rows.map(r => r.renewal_date).sort()[0];
    const latestRenewal = rows.map(r => r.renewal_date).sort().pop();
    console.log(`Earliest Renewal:        ${earliestRenewal}`);
    console.log(`Latest Renewal:          ${latestRenewal}`);
    
    console.log('');
    
    // Validation summary
    const allChecksPassed = allHaveNumbers && noSlashZero && allHaveNames && 
                           allHaveDates && allHavePremium && allHaveType && allHealth;
    
    console.log('━'.repeat(80));
    if (allChecksPassed) {
      console.log('✅ ALL VALIDATIONS PASSED - EXCEL PARSING IS WORKING CORRECTLY');
    } else {
      console.log('⚠️  SOME VALIDATIONS FAILED - PLEASE REVIEW');
    }
    console.log('━'.repeat(80));
    
    // Show a few sample policy numbers to verify /0 removal
    console.log('');
    console.log('📍 SAMPLE POLICY NUMBERS (verify /0 removal):');
    console.log('─'.repeat(80));
    rows.slice(0, 5).forEach((row, i) => {
      console.log(`${i + 1}. ${row.policy_number}`);
    });
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR DURING PARSING:');
    console.error('━'.repeat(80));
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

testExcelParsing();
