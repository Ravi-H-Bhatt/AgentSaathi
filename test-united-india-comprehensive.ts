/**
 * Comprehensive test for United India Insurance parsing
 * Tests both PDF and Excel parsing with complete validation
 */

import * as fs from 'fs';
import { parseUnitedIndiaText } from './src/lib/unitedindia';
import { parseUnitedIndiaExcel } from './src/lib/united-india-excel';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testPDFParser() {
  log('\n=== TESTING PDF PARSER ===', 'cyan');
  
  const pdfPath = './JHA BHAWESKUMAR RAMESHCHANDRA.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    log(`❌ PDF file not found: ${pdfPath}`, 'red');
    return;
  }
  
  // For this test, we'll use mock text since we can't extract PDF here
  // In real scenario, this would come from PDF extraction
  const mockText = `
    UNITED INDIA INSURANCE COMPANY LIMITED
    FAMILY MEDICARE POLICY
    UIIHLIP26046V072526
    POLICY NO.: 0605002826P103732995
    
    PERIOD OF INSURANCE
    FROM 00:00 Hrs on 13/06/2026
    To MIDNIGHT on 12/06/2027
    
    Policyholder
    MR JHA BHAWESKUMAR RAMESHCHANDRA
    A/9/103 ORCHID GREEN FIELD APPLE WOODS TOWNSHIP VILLAGE-SANATHAL SHELA AHMEDABAD
    380058
    AHMADABAD
    GUJARAT
    
    Policy Number 0605002826P103732995 Previous Policy No. 0605002825P103964712
    
    Period Of Insurance From 00:00hrs of 13/06/2026 To Midnight on 12/06/2027
    Policy Type Family Floater Basis Family Floater SI(₹) 1,000,000.00 CB Amount(₹) : 0.00
    
    Insured Details
    Sl no Insured Name DOB & Age/Gender Relation Occupation
    1 BHAWESHKUMAR 15/03/1976 & 50/M Self Salaried
    2 BOBY 27/02/1980 & 46/F Spouse Housewife
    3 ADYA 03/02/2008 & 18/F Daughter - Unmarried Student
    4 AADIT 06/04/2012 & 14/M Son Student
    
    Total Basic Premium(₹) 65,902.00
    Less No Claim Discount(₹) 16,475.50
    Less Family Floater Discount(₹) 14,827.80
    Premium: 34,599.00
    Stamp Duty: 1.00
    Total: 34,599.00
  `;
  
  try {
    const result = parseUnitedIndiaText(mockText);
    
    log('\n📄 PDF Parsing Results:', 'blue');
    log(`✓ Client Name: ${result.client_name}`, 'green');
    log(`✓ Policy Number: ${result.policy_number}`, 'green');
    log(`✓ Previous Policy: ${result.previous_policy_number || 'N/A'}`, result.previous_policy_number ? 'green' : 'yellow');
    log(`✓ Company: ${result.company}`, 'green');
    log(`✓ Product: ${result.product_name}`, 'green');
    log(`✓ Policy Type: ${result.policy_type}`, 'green');
    log(`✓ Holder Type: ${result.policy_holder_type || 'N/A'}`, result.policy_holder_type ? 'green' : 'yellow');
    log(`✓ Sum Insured: ₹${result.sum_insured?.toLocaleString('en-IN') || 'N/A'}`, result.sum_insured ? 'green' : 'yellow');
    log(`✓ Premium: ₹${result.premium?.toLocaleString('en-IN') || 'N/A'}`, result.premium ? 'green' : 'yellow');
    log(`✓ Start Date: ${result.start_date}`, 'green');
    log(`✓ Renewal Date: ${result.renewal_date}`, 'green');
    log(`✓ Address: ${result.client_address || 'N/A'}`, result.client_address ? 'green' : 'yellow');
    
    // Validation checks
    log('\n🔍 Validation:', 'magenta');
    const checks = [
      { name: 'Client name extracted', pass: !!result.client_name },
      { name: 'Policy number extracted', pass: !!result.policy_number },
      { name: 'Previous policy matched', pass: result.previous_policy_number === '0605002825P103964712' },
      { name: 'Floater detected', pass: result.policy_holder_type === 'Floater' },
      { name: 'Product is Family Medicare', pass: result.product_name === 'Family Medicare Policy' },
      { name: 'Sum insured = 1000000', pass: result.sum_insured === 1000000 },
      { name: 'Premium = 34599', pass: result.premium === 34599 },
      { name: 'Company = United India', pass: result.company === 'United India Insurance' },
    ];
    
    let passed = 0;
    let failed = 0;
    
    checks.forEach(check => {
      if (check.pass) {
        log(`  ✅ ${check.name}`, 'green');
        passed++;
      } else {
        log(`  ❌ ${check.name}`, 'red');
        failed++;
      }
    });
    
    log(`\n📊 PDF Test Results: ${passed}/${checks.length} passed`, passed === checks.length ? 'green' : 'yellow');
    
  } catch (error) {
    log(`❌ PDF parsing failed: ${error}`, 'red');
  }
}

function testExcelParser() {
  log('\n=== TESTING EXCEL PARSER ===', 'cyan');
  
  const excelPath = './New Microsoft Excel Worksheet (2) 2.xlsx';
  
  if (!fs.existsSync(excelPath)) {
    log(`❌ Excel file not found: ${excelPath}`, 'red');
    return;
  }
  
  try {
    const buffer = fs.readFileSync(excelPath);
    const results = parseUnitedIndiaExcel(buffer);
    
    log(`\n📊 Parsed ${results.length} policies from Excel`, 'blue');
    
    if (results.length === 0) {
      log('❌ No policies parsed!', 'red');
      return;
    }
    
    // Show first 3 entries
    log('\n📋 Sample Entries:', 'blue');
    results.slice(0, 3).forEach((row, index) => {
      log(`\n${index + 1}. ${row.client_name}`, 'yellow');
      log(`   Policy#: ${row.policy_number}`);
      log(`   Company: ${row.company}`);
      log(`   Product: ${row.product_name}`);
      log(`   Type: ${row.policy_type}`);
      log(`   Holder: ${row.policy_holder_type}`);
      log(`   Premium: ₹${row.premium?.toLocaleString('en-IN')}`);
      log(`   Sum Insured: ₹${row.sum_insured?.toLocaleString('en-IN')}`);
      log(`   Mode: ${row.mode}`);
      log(`   Start: ${row.start_date}`);
      log(`   Renewal: ${row.renewal_date}`);
    });
    
    // Validation checks
    log('\n🔍 Validation:', 'magenta');
    
    const firstRow = results[0];
    const checks = [
      { name: 'Policy numbers cleaned (/0 removed)', pass: !firstRow.policy_number?.includes('/0') },
      { name: 'Company extracted', pass: firstRow.company === 'United India Insurance' },
      { name: 'Product name set', pass: !!firstRow.product_name },
      { name: 'Policy holder type set', pass: !!firstRow.policy_holder_type },
      { name: 'Premium extracted', pass: !!firstRow.premium },
      { name: 'Sum insured calculated', pass: !!firstRow.sum_insured },
      { name: 'Start date calculated', pass: !!firstRow.start_date },
      { name: 'Renewal date set', pass: !!firstRow.renewal_date },
      { name: 'Mode set', pass: firstRow.mode === 'Annual' },
    ];
    
    let passed = 0;
    let failed = 0;
    
    checks.forEach(check => {
      if (check.pass) {
        log(`  ✅ ${check.name}`, 'green');
        passed++;
      } else {
        log(`  ❌ ${check.name}`, 'red');
        failed++;
      }
    });
    
    // Check data completeness
    const missingFields = results.map((row, i) => {
      const missing: string[] = [];
      if (!row.client_name) missing.push('client_name');
      if (!row.policy_number) missing.push('policy_number');
      if (!row.company) missing.push('company');
      if (!row.product_name) missing.push('product_name');
      if (!row.premium) missing.push('premium');
      if (!row.sum_insured) missing.push('sum_insured');
      if (!row.start_date) missing.push('start_date');
      if (!row.renewal_date) missing.push('renewal_date');
      return { index: i + 1, missing };
    }).filter(r => r.missing.length > 0);
    
    if (missingFields.length > 0) {
      log(`\n⚠️  ${missingFields.length} rows have missing fields:`, 'yellow');
      missingFields.slice(0, 5).forEach(r => {
        log(`   Row ${r.index}: ${r.missing.join(', ')}`, 'yellow');
      });
      if (missingFields.length > 5) {
        log(`   ... and ${missingFields.length - 5} more`, 'yellow');
      }
    } else {
      log('\n✅ All rows have complete data', 'green');
    }
    
    log(`\n📊 Excel Test Results: ${passed}/${checks.length} passed`, passed === checks.length ? 'green' : 'yellow');
    
  } catch (error) {
    log(`❌ Excel parsing failed: ${error}`, 'red');
    console.error(error);
  }
}

// Run all tests
log('╔══════════════════════════════════════════╗', 'cyan');
log('║  UNITED INDIA COMPREHENSIVE TEST SUITE  ║', 'cyan');
log('╚══════════════════════════════════════════╝', 'cyan');

testPDFParser();
testExcelParser();

log('\n✨ All tests complete!\n', 'cyan');
