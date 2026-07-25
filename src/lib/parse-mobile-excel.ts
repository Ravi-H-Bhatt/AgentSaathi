import * as XLSX from "xlsx";

/**
 * Excel row format for mobile number updates:
 * - Column 1: Client Name (required, must match exactly)
 * - Column 2: Mobile Number (optional, 10 digits only)
 * - Column 3: Email (optional)
 */
export interface MobileUpdateRow {
  clientName: string;
  mobileNumber?: string;
  email?: string;
}

/**
 * Parse Excel file for mobile number updates.
 * 
 * Expected columns:
 * 1. Client Name
 * 2. Mobile Number (10 digits)
 * 3. Email (optional)
 * 
 * Returns an array of parsed rows, skipping header and empty rows.
 */
export async function parseExcelMobileUpdates(
  file: File
): Promise<MobileUpdateRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No sheets found in Excel file");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Could not read sheet");
  }

  // Parse as array of objects, using first row as header
  const data = XLSX.utils.sheet_to_json(sheet, { 
    defval: "",
    header: 1, // Returns array of arrays
  }) as any[][];

  const rows: MobileUpdateRow[] = [];

  if (data.length < 2) {
    throw new Error("Excel file must have at least a header row and one data row");
  }

  // Process each row (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    if (!row || row.length === 0) continue; // Skip empty rows
    
    const clientName = String(row[0] || "").trim();
    const mobileNumber = String(row[1] || "").trim();
    const email = String(row[2] || "").trim();

    // Skip if no client name
    if (!clientName || clientName.length < 2) continue;

    // Validate mobile number format if provided
    const validPhone = mobileNumber ? mobileNumber.replace(/\D/g, "") : undefined;
    const isValidPhone = validPhone ? /^\d{10}$/.test(validPhone) : false;

    rows.push({
      clientName,
      mobileNumber: isValidPhone ? validPhone : undefined,
      email: email && email.includes("@") ? email : undefined,
    });
  }

  if (rows.length === 0) {
    throw new Error("No valid rows found in Excel file");
  }

  return rows;
}

/**
 * Validate a single mobile number (10 digits only).
 */
export function isValidMobileNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return /^\d{10}$/.test(cleaned);
}

/**
 * Validate a single email address.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generate sample Excel file content for download.
 */
export function generateSampleExcelData(): string {
  const sampleData = [
    ["Client Name", "Mobile Number", "Email"],
    ["Aakash Jaykumar Shah", "9512039766", "aakash@email.com"],
    ["Abhay Rameshchandra Shah", "9376115120", ""],
    ["Ajay Ramanlal Patel", "9979765331", "ajay@example.com"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  ws["!cols"] = [
    { wch: 30 }, // Client Name
    { wch: 15 }, // Mobile Number
    { wch: 25 }, // Email
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");

  return XLSX.write(wb, { bookType: "xlsx", type: "base64" });
}
