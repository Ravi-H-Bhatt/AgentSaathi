/**
 * Full flow test for United India - Excel and PDF
 * Tests actual file parsing and displays all issues
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseUnitedIndiaExcel } from './src/lib/united-india-excel';
import { parseUnitedIndiaText } from './src/lib/unitedindia';
const pdfParse = require('pdf-parse');

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

async function testExcelParsing() {
  log('\n╔══════════════════════════════════════════╗', 'cyan');
  log('║       TESTING EXCEL PARSING              ║', 'cyan');
  log('╚══════════════════════════════════════════╝', 'cyan');
  
  const excelPath = path.join(process.env.HOME!, 'Downloads', 'New Microsoft Excel Worksheet (2) 2.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    log(`❌ Excel file not found: ${excelPath}`, 'red');
    return;
  }
  
  log(`✓ Found Excel file: ${excelPath}`, 'green');
  
  try {
    const buffer = fs.readFileSync(excelPath);
    log(`✓ Read ${buffer.length} bytes`, 'green');
    
    const results = parseUnitedIndiaExcel(buffer);
    
    log(`\n📊 RESULTS: Parsed ${results.length} policies`, results.length > 0 ? 'green' : 'red');
    
    if (results.length === 0) {
      log('❌ NO POLICIES PARSED - This is the main issue!', 'red');
      return;
    }
    
    // Display first 5 entries in detail
    log('\n📋 DETAILED VIEW (First 5 entries):', 'blue');
    results.slice(0, 5).forEach((row, index) => {
      log(`\n─────── Entry ${index + 1} ───────`, 'yellow');
      log(`Client Name    : ${row.client_name || '❌ MISSING'}`, row.client_name ? 'green' : 'red');
      log(`Policy Number  : ${row.policy_number || '❌ MISSING'}`, row.policy_number ? 'green' : 'red');
      log(`Company        : ${row.company || '❌ MISSING'}`, row.company ? 'green' : 'red');
      log(`Product        : ${row.product_name || '❌ MISSING'}`, row.product_name ? 'green' : 'red');
      log(`Policy Type    : ${row.policy_type || '❌ MISSING'}`, row.policy_type ? 'green' : 'red');
      log(`Holder Type    : ${row.policy_holder_type || '❌ MISSING'}`, row.policy_holder_type ? 'green' : 'red');
      log(`Premium        : ${row.premium ? '₹' + row.premium.toLocaleString('en-IN') : '❌ MISSING'}`, row.premium ? 'green' : 'red');
      log(`Sum Insured    : ${row.sum_insured ? '₹' + row.sum_insured.toLocaleString('en-IN') : '❌ MISSING'}`, row.sum_insured ? 'green' : 'red');
      log(`Mode           : ${row.mode || '❌ MISSING'}`, row.mode ? 'green' : 'red');
      log(`Start Date     : ${row.start_date || '❌ MISSING'}`, row.start_date ? 'green' : 'red');
      log(`Renewal Date   : ${row.renewal_date || '❌ MISSING'}`, row.renewal_date ? 'green' : 'red');
      log(`Prev Policy    : ${row.previous_policy_number || 'N/A'}`, 'cyan');
    });
    
    // Field completeness analysis
    log('\n📊 FIELD COMPLETENESS ANALYSIS:', 'magenta');
    const fields = [
      'client_name', 'policy_number', 'company', 'product_name', 
      'policy_type', 'policy_holder_type', 'premium', 'sum_insured',
      'mode', 'start_date', 'renewal_date'
    ];
    
    fields.forEach(field => {
      const filled = results.filter((r: any) => r[field]).length;
      const percentage = ((filled / results.length) * 100).toFixed(1);
      const status = filled === results.length ? '✅' : filled > 0 ? '⚠️ ' : '❌';
      log(`${status} ${field.padEnd(20)}: ${filled}/${results.length} (${percentage}%)`, 
          filled === results.length ? 'green' : filled > 0 ? 'yellow' : 'red');
    });
    
    // Check for /0 in policy numbers
    const withSlashZero = results.filter(r => r.policy_number?.includes('/0'));
    if (withSlashZero.length > 0) {
      log(`\n❌ CRITICAL: ${withSlashZero.length} policies still have "/0" suffix!`, 'red');
      withSlashZero.slice(0, 3).forEach(r => {
        log(`   • ${r.policy_number}`, 'red');
      });
    } else {
      log('\n✅ All policy numbers cleaned (/0 removed)', 'green');
    }
    
  } catch (error: any) {
    log(`\n❌ EXCEL PARSING FAILED: ${error.message}`, 'red');
    console.error(error);
  }
}

async function testPDFParsing() {
  log('\n╔══════════════════════════════════════════╗', 'cyan');
  log('║        TESTING PDF PARSING               ║', 'cyan');
  log('╚══════════════════════════════════════════╝', 'cyan');
  
  const pdfPath = path.join(process.env.HOME!, 'Downloads', 'JHA BHAWESKUMAR RAMESHCHANDRA.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    log(`❌ PDF file not found: ${pdfPath}`, 'red');
    return;
  }
  
  log(`✓ Found PDF file: ${pdfPath}`, 'green');
  
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    log(`✓ Read ${dataBuffer.length} bytes`, 'green');
    
    const pdfData = await pdfParse(dataBuffer);
    log(`✓ Extracted ${pdfData.text.length} characters of text`, 'green');
    
    // Show relevant sections
    log('\n📄 KEY SECTIONS FROM PDF:', 'blue');
    
    // Policy numbers
    const policyMatch = pdfData.text.match(/Policy Number\s+(\d+[A-Z]\d+)\s+Previous Policy No\.\s+(\d+[A-Z]\d+)/i);
    if (policyMatch) {
      log(`Current Policy : ${policyMatch[1]}`, 'green');
      log(`Previous Policy: ${policyMatch[2]}`, 'green');
    } else {
      log('❌ Could not find policy numbers in expected format', 'red');
    }
    
    // Policy type
    const floaterMatch = pdfData.text.match(/Family Floater Basis|Policy Type\s*Family Floater/i);
    log(`Floater Basis  : ${floaterMatch ? '✅ FOUND' : '❌ NOT FOUND'}`, floaterMatch ? 'green' : 'red');
    
    // Sum Insured
    const siMatch = pdfData.text.match(/Family Floater SI\s*[₹()\s]*\s*([\d,]+)/i);
    log(`Sum Insured    : ${siMatch ? '✅ ₹' + siMatch[1] : '❌ NOT FOUND'}`, siMatch ? 'green' : 'red');
    
    // Premium
    const premiumMatch = pdfData.text.match(/Total:\s*([\d,]+\.?\d*)/i);
    log(`Premium        : ${premiumMatch ? '✅ ₹' + premiumMatch[1] : '❌ NOT FOUND'}`, premiumMatch ? 'green' : 'red');
    
    // Parse with our parser
    log('\n🔍 PARSING WITH OUR PARSER:', 'blue');
    const result = parseUnitedIndiaText(pdfData.text);
    
    log(`\n─────── PARSED RESULT ───────`, 'yellow');
    log(`Client Name    : ${result.client_name || '❌ MISSING'}`, result.client_name ? 'green' : 'red');
    log(`Policy Number  : ${result.policy_number || '❌ MISSING'}`, result.policy_number ? 'green' : 'red');
    log(`Previous Policy: ${result.previous_policy_number || '❌ MISSING'}`, result.previous_policy_number ? 'green' : 'red');
    log(`Company        : ${result.company || '❌ MISSING'}`, result.company ? 'green' : 'red');
    log(`Product        : ${result.product_name || '❌ MISSING'}`, result.product_name ? 'green' : 'red');
    log(`Policy Type    : ${result.policy_type || '❌ MISSING'}`, result.policy_type ? 'green' : 'red');
    log(`Holder Type    : ${result.policy_holder_type || '❌ MISSING'}`, result.policy_holder_type ? 'green' : 'red');
    log(`Premium        : ${result.premium ? '₹' + result.premium.toLocaleString('en-IN') : '❌ MISSING'}`, result.premium ? 'green' : 'red');
    log(`Sum Insured    : ${result.sum_insured ? '₹' + result.sum_insured.toLocaleString('en-IN') : '❌ MISSING'}`, result.sum_insured ? 'green' : 'red');
    log(`Start Date     : ${result.start_date || '❌ MISSING'}`, result.start_date ? 'green' : 'red');
    log(`Renewal Date   : ${result.renewal_date || '❌ MISSING'}`, result.renewal_date ? 'green' : 'red');
    log(`Address        : ${result.client_address || '❌ MISSING'}`, result.client_address ? 'green' : 'red');
    
    // Validation
    log('\n✅ VALIDATION CHECKS:', 'magenta');
    const checks = [
      { name: 'Current policy = 0605002826P103732995', pass: result.policy_number === '0605002826P103732995' },
      { name: 'Previous policy = 0605002825P103964712', pass: result.previous_policy_number === '0605002825P103964712' },
      { name: 'Holder type = Floater', pass: result.policy_holder_type === 'Floater' },
      { name: 'Product = Family Medicare Policy', pass: result.product_name === 'Family Medicare Policy' },
      { name: 'Sum Insured = 1000000', pass: result.sum_insured === 1000000 },
      { name: 'Premium = 34599', pass: result.premium === 34599 || result.premium === 34600 },
      { name: 'Company = United India Insurance', pass: result.company === 'United India Insurance' },
    ];
    
    let passed = 0;
    checks.forEach(check => {
      if (check.pass) {
        log(`  ✅ ${check.name}`, 'green');
        passed++;
      } else {
        log(`  ❌ ${check.name}`, 'red');
      }
    });
    
    log(`\n📊 PDF Score: ${passed}/${checks.length} checks passed`, passed === checks.length ? 'green' : 'yellow');
    
  } catch (error: any) {
    log(`\n❌ PDF PARSING FAILED: ${error.message}`, 'red');
    console.error(error);
  }
}

async function testMatching() {
  log('\n╔══════════════════════════════════════════╗', 'cyan');
  log('║      TESTING POLICY MATCHING LOGIC       ║', 'cyan');
  log('╚══════════════════════════════════════════╝', 'cyan');
  
  log('\n🔍 MATCHING SCENARIO:', 'blue');
  log('We have a PDF with:', 'cyan');
  log('  • Current Policy : 0605002826P103732995', 'cyan');
  log('  • Previous Policy: 0605002825P103964712', 'cyan');
  log('  • Client Name    : JHA BHAWESKUMAR RAMESHCHANDRA', 'cyan');
  
  log('\n❓ QUESTIONS TO ANSWER:', 'yellow');
  log('1. Is the previous policy (0605002825P103964712) in the Excel?', 'yellow');
  log('2. Does the client name match any existing client?', 'yellow');
  log('3. Should it create a new policy or update existing?', 'yellow');
  
  log('\n📝 EXPECTED BEHAVIOR:', 'green');
  log('✓ Should match previous policy number from Excel', 'green');
  log('✓ Should attach PDF to the existing client who has that policy', 'green');
  log('✓ Should create new policy row for the current (2026) policy', 'green');
  log('✓ Previous policy acts as a "renewal link"', 'green');
}

// Run all tests
(async () => {
  log('\n╔═══════════════════════════════════════════════════╗', 'cyan');
  log('║  UNITED INDIA COMPREHENSIVE FLOW TEST            ║', 'cyan');
  log('╚═══════════════════════════════════════════════════╝', 'cyan');
  
  await testExcelParsing();
  await testPDFParsing();
  await testMatching();
  
  log('\n✨ All tests complete!\n', 'cyan');
})();
