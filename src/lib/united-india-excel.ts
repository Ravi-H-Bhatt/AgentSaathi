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
    const policyNumber = row[2] ? String(row[2]).trim() : '';
    const insuredName = row[3] ? String(row[3]).trim().replace(/\.$/, '') : '';
    const expiryDate = parseDate(row[4]);
    const premium = parseNumber(row[5]);
    const insuredType = row[8] ? String(row[8]).trim() : 'Individual';
    
    if (!insuredName || !policyNumber) continue;
    
    rows.push({
      sn: null,
      client_name: insuredName,
      client_phone: null,
      client_address: null,
      policy_number: policyNumber,
      policy_type: departmentName || 'Health',
      policy_holder_type: insuredType,
      product_name: null,
      company: 'UNITED INDIA',
      mode: null,
      renewal_date: expiryDate,
      premium: premium,
      sum_insured: null,
      start_date: '',
      previous_policy_number: null,
    });
  }
  
  console.log(`[united-india-excel] Parsed ${rows.length} policies`);
  return rows;
}
