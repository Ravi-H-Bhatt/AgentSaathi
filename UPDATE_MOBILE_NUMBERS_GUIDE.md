# Easy Way to Update Mobile Numbers for Clients

## Step 1: Get the Agent ID for Harshal Bhatt

Run this in Supabase SQL Editor:

```sql
SELECT id, full_name, email FROM public.agents 
WHERE lower(full_name) LIKE '%harshal%bhatt%' 
   OR lower(email) LIKE '%harshal%';
```

Copy the agent ID (UUID format). You'll need it for the next steps.

---

## Step 2: Export Clients Data to Excel

### Option A: Export ALL Clients of Harshal Bhatt

Run this query in Supabase SQL Editor:

```sql
SELECT 
  c.id,
  c.full_name AS "Client Name",
  c.email AS "Email",
  c.phone AS "Current Phone",
  COUNT(p.id) AS "Policy Count"
FROM public.clients c
LEFT JOIN public.policies p ON c.id = p.client_id
WHERE c.agent_id = 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'
GROUP BY c.id, c.full_name, c.email, c.phone
ORDER BY c.full_name;
```

Replace `'PASTE_AGENT_ID_HERE'` with the actual agent ID from Step 1.

**Export:** Click "Export to CSV" → Open in Excel

---

### Option B: Export Only LIC Clients of Harshal Bhatt

```sql
SELECT DISTINCT
  c.id,
  c.full_name AS "Client Name",
  c.email AS "Email",
  c.phone AS "Current Phone",
  p.company AS "Company",
  COUNT(p.id) AS "Policy Count"
FROM public.clients c
LEFT JOIN public.policies p ON c.id = p.client_id
WHERE c.agent_id = 'PASTE_AGENT_ID_HERE'
  AND p.company = 'LIC'
GROUP BY c.id, c.full_name, c.email, c.phone, p.company
ORDER BY c.full_name;
```

---

### Option C: Export ALL Home Insurance Clients of Harshal Bhatt (NOT LIC)

This query gets everyone EXCEPT LIC:

```sql
SELECT DISTINCT
  c.id,
  c.full_name AS "Client Name",
  c.email AS "Email",
  c.phone AS "Current Phone",
  p.company AS "Company",
  COUNT(p.id) AS "Policy Count"
FROM public.clients c
LEFT JOIN public.policies p ON c.id = p.client_id
WHERE c.agent_id = 'PASTE_AGENT_ID_HERE'
  AND (p.company IS NULL OR p.company != 'LIC')
GROUP BY c.id, c.full_name, c.email, c.phone, p.company
ORDER BY c.full_name;
```

This will show all 1900+ home insurance policies for all companies EXCEPT LIC.

---

## Step 3: Edit Excel File

### Excel Template Format

The Excel file should have these columns (in order):

| Client Name | Mobile Number | Email (Optional) |
|-------------|---------------|-----------------|
| Aakash Jaykumar Shah | 9512039766 | aakash@email.com |
| Abhay Rameshchandra Shah | 9376115120 | |
| Ajay Ramanlal Patel | 9979765331 | ajay@example.com |

**Important:**
- ✅ **Column 1:** Client Name (must match exactly)
- ✅ **Column 2:** Mobile Number (10 digits, no +91 or 91 prefix)
- ✅ **Column 3:** Email (optional - if present, will update email too)

### Steps to Edit:
1. Add/update mobile numbers in Column 2
2. Optionally add emails in Column 3
3. **Keep the header row** (do not delete it)
4. Delete rows for clients you don't want to update
5. Save as `.xlsx` file

---

## Step 4: Create the Upload Endpoint

Create a new API endpoint to process the mobile numbers update:

**File:** `src/app/api/update-mobile-numbers/route.ts`

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { permissionsFor, logActivity } from "@/lib/team";

export const runtime = "nodejs";

interface MobileUpdateRow {
  clientName: string;
  mobileNumber?: string;
  email?: string;
}

export async function POST(request: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent || agent.status !== "approved") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Parse Excel file
    const { parseExcelMobileUpdates } = await import("@/lib/parse-mobile-excel");
    const updates: MobileUpdateRow[] = await parseExcelMobileUpdates(file);

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid data found in Excel file" },
        { status: 400 }
      );
    }

    const db = createAdminClient();

    // Process each row
    const results: any[] = [];
    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const row of updates) {
      try {
        // Find client by name (case-insensitive)
        const { data: client, error: findError } = await db
          .from("clients")
          .select("id, full_name")
          .eq("agent_id", agent.id)
          .ilike("full_name", row.clientName)
          .single();

        if (findError || !client) {
          results.push({
            clientName: row.clientName,
            status: "not_found",
            message: `Client not found`,
          });
          notFound++;
          continue;
        }

        // Update client with phone and/or email
        const updateData: any = {};
        if (row.mobileNumber) {
          updateData.phone = row.mobileNumber;
        }
        if (row.email) {
          updateData.email = row.email;
        }

        if (Object.keys(updateData).length === 0) {
          results.push({
            clientName: row.clientName,
            status: "skipped",
            message: "No phone or email provided",
          });
          continue;
        }

        const { error: updateError } = await db
          .from("clients")
          .update(updateData)
          .eq("id", client.id);

        if (updateError) {
          results.push({
            clientName: row.clientName,
            status: "error",
            message: updateError.message,
          });
          errors++;
        } else {
          results.push({
            clientName: row.clientName,
            status: "updated",
            phone: row.mobileNumber || "—",
            email: row.email || "—",
          });
          updated++;
        }
      } catch (err) {
        results.push({
          clientName: row.clientName,
          status: "error",
          message: (err as Error).message,
        });
        errors++;
      }
    }

    // Log activity
    await logActivity(agent, "update_mobile_numbers", file.name, {
      total: updates.length,
      updated,
      notFound,
      errors,
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: updates.length,
        updated,
        notFound,
        errors,
      },
      results,
    });
  } catch (error) {
    console.error("[update-mobile] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Processing failed",
      },
      { status: 500 }
    );
  }
}
```

---

## Step 5: Parse Excel File

Create Excel parser:

**File:** `src/lib/parse-mobile-excel.ts`

```typescript
import * as XLSX from "xlsx";

interface MobileUpdateRow {
  clientName: string;
  mobileNumber?: string;
  email?: string;
}

export async function parseExcelMobileUpdates(
  file: File
): Promise<MobileUpdateRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Parse as array of objects
  const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const rows: MobileUpdateRow[] = [];

  for (const row of data) {
    // Try to find relevant columns (case-insensitive)
    const clientName = Object.values(row).find(
      (val: any) =>
        typeof val === "string" && val.length > 3 && !val.match(/^\d+$/)
    ) as string;

    if (!clientName || clientName.toLowerCase() === "client name") {
      continue; // Skip header or empty rows
    }

    // Get values in order: name, mobile, email
    const values = Object.values(row)
      .map((v) => String(v || "").trim())
      .filter((v) => v);

    if (values.length === 0) continue;

    const mobileNumber = values
      .find((v) => /^\d{10}$/.test(v))
      ?.replace(/^\d{10}$/, (m) => m);

    const email = values.find((v) => v.includes("@"));

    rows.push({
      clientName,
      mobileNumber,
      email,
    });
  }

  return rows;
}
```

---

## Step 6: Create Upload Component

**File:** `src/app/admin/update-mobile/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle, X } from "lucide-react";

export default function UpdateMobileNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/update-mobile-numbers", {
        method: "POST",
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Upload failed");
      } else {
        setResults(data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Update Mobile Numbers</h1>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="mb-8 p-6 bg-gray-50 rounded-lg">
        <label className="block mb-4">
          <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
            <div className="text-center">
              <Upload size={24} className="mx-auto mb-2 text-gray-500" />
              <p className="text-sm text-gray-600">
                {file ? file.name : "Click to select Excel file"}
              </p>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Upload & Update"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {results && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Update Complete</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {results.summary.total}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Updated ✓</p>
              <p className="text-2xl font-bold text-green-600">
                {results.summary.updated}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Not Found</p>
              <p className="text-2xl font-bold text-yellow-600">
                {results.summary.notFound}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-red-600">
                {results.summary.errors}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Results */}
      {results?.results && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
          {results.results.map((result: any, idx: number) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                {result.status === "updated" && (
                  <CheckCircle2 size={16} className="text-green-600 mt-0.5" />
                )}
                {result.status === "not_found" && (
                  <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
                )}
                {result.status === "error" && (
                  <X size={16} className="text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {result.clientName}
                  </p>
                  {result.phone && (
                    <p className="text-gray-600">📱 {result.phone}</p>
                  )}
                  {result.email && (
                    <p className="text-gray-600">📧 {result.email}</p>
                  )}
                  {result.message && (
                    <p className="text-gray-600 text-xs">{result.message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Excel Format</h3>
        <p className="text-blue-800 text-sm mb-3">
          Your Excel file must have these columns:
        </p>
        <div className="bg-white p-3 rounded border border-blue-200 text-xs font-mono">
          <p>Client Name | Mobile Number | Email (optional)</p>
          <p className="text-gray-600 mt-2">Example:</p>
          <p>Aakash Shah | 9512039766 | aakash@email.com</p>
          <p>Abhay Shah | 9376115120 |</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Quick Start Summary

### For Agent Users:

1. **Download** - Run SQL query → Export to CSV → Open in Excel
2. **Edit** - Add mobile numbers (and emails if needed)
3. **Upload** - Go to Settings → Update Mobile Numbers → Upload Excel
4. **Done** - All matching clients updated instantly ✅

### For Admins (Direct Database):

If you have direct database access, use this UPDATE query:

```sql
UPDATE public.clients c
SET 
  phone = CASE 
    WHEN cm.phone IS NOT NULL THEN cm.phone 
    ELSE c.phone 
  END,
  email = CASE 
    WHEN cm.email IS NOT NULL THEN cm.email 
    ELSE c.email 
  END
FROM (
  VALUES 
    ('Aakash Jaykumar Shah', '9512039766', 'aakash@email.com'),
    ('Abhay Rameshchandra Shah', '9376115120', NULL),
    ('Ajay Ramanlal Patel', '9979765331', 'ajay@example.com')
) AS cm(name, phone, email)
WHERE LOWER(c.full_name) = LOWER(cm.name)
  AND c.agent_id = 'PASTE_AGENT_ID_HERE';
```

---

## Troubleshooting

### Client Not Found?
- Check spelling exactly matches database
- Run: `SELECT DISTINCT full_name FROM public.clients WHERE agent_id = 'AGENT_ID' LIMIT 20;`

### Mobile Number Not Updating?
- Ensure 10 digits only (no +91, 91, spaces, or dashes)
- Example: `9512039766` ✅ NOT `+91 95120 39766` ❌

### Email Not Updating?
- Column 3 is optional but must be in correct position
- Valid format: `name@domain.com`

---

Done! This is the easiest way. 🚀
