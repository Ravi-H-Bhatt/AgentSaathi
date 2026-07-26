/**
 * Parse United India Excel format
 * Columns: Dept Code | Department Name | Policy/Endt number | Insured Name | 
 *          Policy Expiry Date | ELG Premium Amount | Ineligible Amount | 
 *          Commission Amount | Insured Type
 */
import * as XLSX from 'xlsx';
import type { RegisterRow } from './types';

function parseDate(val: any): string {
  if (!val) return '';
  
  // Excel dates are numbers (days since 1900-01-01)
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const d = new Date(date.y, date.m - 1, date.d);
      return d.toISOString().split('T')[0];
    }
  }
  
  // Try parsing string dates like "12/06/2026"
  if (typeof val === 'string') {
    const parts = val.trim().split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  return String(val);
}

function parseNumber(val: any): number | null {
  if (val == null || val === '') return null;
  
  // Handle string numbers with commas
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  
  if (typeof val === 'number') return val;
  return null;
}

export function parseUnitedIndiaExcel(buffer: Buffer): RegisterRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert to array of arrays
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const rows: RegisterRow[] = [];
  
  // Find header row (contains "Policy" or "Insured Name")
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row.some((cell: any) => 
      String(cell).toLowerCase().includes('policy') || 
      String(cell).toLowerCase().includes('insured name')
    )) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    console.warn('[united-india-excel] No header row found');
    return rows;
  }
  
  // Parse data rows
  for (let i = headerIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 5) continue;
    
    // Skip empty rows
    if (!row[3] || String(row[3]).trim() === '') continue;
    
    const departmentName = row[1] ? String(row[1]).trim() : '';
    let policyNumber = row[2] ? String(row[2]).trim() : '';
    // Remove "/0" suffix from policy numbers (e.g., "0605002825P107058385/0" -> "0605002825P107058385")
    policyNumber = policyNumber.replace(/\/0$/, '');
    const insuredName = row[3] ? String(row[3]).trim().replace(/\.$/, '') : '';
    const expiryDate = parseDate(row[4]);
    const eligiblePremium = parseNumber(row[5]);
    const ineligibleAmount = parseNumber(row[6]);
    const commissionAmount = parseNumber(row[7]);
    const insuredType = row[8] ? String(row[8]).trim() : 'Individual';
    
    if (!insuredName || !policyNumber) continue;
    
    // Calculate sum insured (typically ELG Premium * 10-20 for health policies, but we don't have exact formula)
    // For now, extract from policy number pattern or set based on premium ranges
    let sumInsured: number | null = null;
    if (eligiblePremium) {
      // Typical United India ranges: 10-40k premium = 5-10L cover, 40-100k = 10-20L cover
      if (eligiblePremium < 20000) sumInsured = 500000;
      else if (eligiblePremium < 40000) sumInsured = 1000000;
      else if (eligiblePremium < 60000) sumInsured = 1500000;
      else if (eligiblePremium < 80000) sumInsured = 2000000;
      else sumInsured = 2500000;
    }
    
    // Calculate start date (1 year before renewal date)
    let startDate: string | null = null;
    if (expiryDate) {
      try {
        const renewalDateObj = new Date(expiryDate);
        const startDateObj = new Date(renewalDateObj);
        startDateObj.setFullYear(startDateObj.getFullYear() - 1);
        startDate = startDateObj.toISOString().split('T')[0];
      } catch (e) {
        console.warn('[united-india-excel] Failed to calculate start date:', e);
      }
    }
    
    // Determine product name from department and insured type
    let productName = 'Health Insurance';
    if (departmentName.toLowerCase().includes('health')) {
      if (insuredType.toLowerCase() === 'floater') {
        productName = 'Family Medicare Policy - Floater';
      } else {
        productName = 'Family Medicare Policy - Individual';
      }
    }
    
    // Total premium = Eligible + Ineligible
    const totalPremium = eligiblePremium && ineligibleAmount 
      ? eligiblePremium + ineligibleAmount 
      : eligiblePremium;
    
    rows.push({
      sn: null,
      client_name: insuredName,
      client_phone: null,
      client_address: null,
      policy_number: policyNumber,
      policy_type: 'Health Insurance',
      policy_holder_type: insuredType,
      product_name: productName,
      company: 'United India Insurance',
      mode: 'Annual',  // Assume annual from expiry date format
      renewal_date: expiryDate,
      premium: totalPremium,
      sum_insured: sumInsured,
      start_date: startDate,
      previous_policy_number: null,
    });
  }
  
  console.log(`[united-india-excel] Parsed ${rows.length} policies from United India Excel`);
  
  // Log first 3 for debugging
  if (rows.length > 0) {
    console.log('[united-india-excel] Sample rows:');
    rows.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.client_name} | Policy: ${r.policy_number} | Premium: ${r.premium} | SI: ${r.sum_insured} | Product: ${r.product_name} | Type: ${r.policy_holder_type}`);
    });
  }
  
  return rows;
}
