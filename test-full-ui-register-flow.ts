/**
 * Full simulation of the upload flow for United India Premium Register
 * This tests the exact same code path as the API route
 */

async function simulateUploadFlow() {
  console.log('=== Simulating United India Premium Register Upload ===\n');
  
  // Sample text from the PDF (same as what PDF extraction would return)
  const text = `UNITED INDIA INSURANCE COMPANY LIMITED
Premium Register
From : 1 Jul 2026 , To : 26 Jul 2026
Report Run Date & Time : 26 Jul 2026 13:41
(Amount in Rs)
Page No: 1 / 5

S.NO. RO Code Office Code Policy Number Endorsement Number Collection Date Insured Name Policy Effective Date Policy Expiry Date Department Sum Insured TP Premium OD 
Chassis Number RO Name Office Name Engine Number Registration Number Service Tax Stamp Duty Intermediary Code CoInsurance Remarks Collection Number Policy Type (Office Policy/Portal Policy) Own Share % Col

1 060000 9060500 0605002826P104874070 0 02/07/2026 RUPALI R. DAVE 6 Jul 2026 5 Jul 2027 Health 600000.00 0.00 57409 
RO AHMEDABAD DO 5 AHMEDABAD 0 1 AGI0031140 -- NA -- NANo Co-Insurance 10106050026135416886 OFFICE POLICY 100 NO 

2 060000 9060500 0605002826P104959270 0 03/07/2026 JAGRUTIBEN J. VASAVADA 16 Jul 2026 15 Jul 2027 Health 250000.00 0.00 2924
RO AHMEDABAD DO 5 AHMEDABAD 0 1 AGI0031140 -- NA -- NANo Co-Insurance 10106050026135504426 Portal Policy 100 NO`;

  console.log(`📄 Text length: ${text.length} characters\n`);

  // Step 1: Check if text is readable
  if (!text || text.length < 20) {
    console.log('❌ FAIL: PDF has no readable text layer\n');
    console.log('Response would be:');
    console.log({
      scanned: true,
      message: "This PDF has no readable text layer (it may be a scan/image)."
    });
    return;
  }
  console.log('✅ Text layer readable\n');

  // Step 2: Check LIC Date Wise (happens first in extract route)
  const { looksLikeLicDateWise } = await import('./src/lib/lic-date-wise');
  if (looksLikeLicDateWise(text)) {
    console.log('❌ FAIL: Misdetected as LIC Date Wise\n');
    return;
  }
  console.log('✅ Not LIC Date Wise\n');

  // Step 3: Check LIC Premium Due List
  const { looksLikeLicPremiumDueList } = await import('./src/lib/lic-premium-due');
  if (looksLikeLicPremiumDueList(text)) {
    console.log('❌ FAIL: Misdetected as LIC Premium Due\n');
    return;
  }
  console.log('✅ Not LIC Premium Due\n');

  // Step 4: parseRegisterAuto (this should detect United India)
  const { parseRegisterAuto } = await import('./src/lib/register');
  const { rows, type, confidence } = await parseRegisterAuto(text);
  
  console.log('--- parseRegisterAuto Results ---');
  console.log(`Type: ${type}`);
  console.log(`Confidence: ${confidence}`);
  console.log(`Rows: ${rows.length}`);
  console.log('');

  if (rows.length > 0 && confidence >= 0.5) {
    console.log('✅ Register detected and parsed!\n');
    
    // Check which handler would be used
    if (type === 'newindia-schedule') {
      console.log('Handler: New India Schedule (mode: "schedule")');
    } else if (type === 'newindia') {
      console.log('Handler: New India Fast Extraction (mode: "bulk")');
    } else if (type === 'eregister') {
      console.log('Handler: E-Register Coordinate Extraction (mode: "bulk")');
    } else {
      console.log('Handler: Default (mode: "bulk")');
    }
    
    console.log('\nResponse would be:');
    console.log({
      scanned: false,
      mode: "bulk",
      rowCount: rows.length,
      registerType: type,
      confidence
    });
    
    console.log('\nFirst policy:');
    console.log(rows[0]);
    
    console.log('\n✅ SUCCESS: Upload would work correctly!\n');
    return;
  }
  
  console.log('⚠️  parseRegisterAuto returned no rows or low confidence\n');
  
  // Step 5: Check if multi-policy document
  const policyCount = (text.match(/\b\d{9,}\b/g) || []).length;
  console.log(`Policy numbers found: ${policyCount}`);
  
  if (policyCount >= 10) {
    console.log('Would try: Bulk LLM extraction\n');
  }
  
  // Step 6: Check if single United India policy
  const lowerText = text.toLowerCase();
  const isUnitedIndia = lowerText.includes("united india insurance") ||
                       lowerText.includes("uiic.co.in") ||
                       (lowerText.includes("irdai reg") && lowerText.includes("545"));
  
  console.log(`Is United India single policy: ${isUnitedIndia}`);
  
  if (isUnitedIndia) {
    console.log('Would try: Single United India policy parser\n');
  }
  
  // Step 7: Fallback to LLM
  console.log('\n❌ FAIL: Would fall back to single-policy LLM extraction');
  console.log('This is why you see "Could not auto-parse" message\n');
}

simulateUploadFlow().catch(console.error);
