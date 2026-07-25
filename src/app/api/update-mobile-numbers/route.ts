import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { logActivity } from "@/lib/team";
import { parseExcelMobileUpdates } from "@/lib/parse-mobile-excel";

export const runtime = "nodejs";
export const maxDuration = 60;

interface UpdateResult {
  clientName: string;
  status: "updated" | "not_found" | "skipped" | "error";
  phone?: string;
  email?: string;
  message?: string;
}

interface UpdateSummary {
  total: number;
  updated: number;
  notFound: number;
  skipped: number;
  errors: number;
}

/**
 * Upload Excel file with mobile numbers and update matching clients.
 * 
 * Expected Excel format:
 * Column 1: Client Name (required)
 * Column 2: Mobile Number (optional, 10 digits)
 * Column 3: Email (optional)
 */
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

    // Validate file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Only Excel files (.xlsx, .xls) are supported" },
        { status: 400 }
      );
    }

    // Parse Excel file
    let updates;
    try {
      updates = await parseExcelMobileUpdates(file);
    } catch (parseErr) {
      return NextResponse.json(
        {
          error: `Excel parsing failed: ${parseErr instanceof Error ? parseErr.message : "Unknown error"}`,
        },
        { status: 400 }
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid data found in Excel file" },
        { status: 400 }
      );
    }

    const db = createAdminClient();
    const results: UpdateResult[] = [];
    const summary: UpdateSummary = {
      total: updates.length,
      updated: 0,
      notFound: 0,
      skipped: 0,
      errors: 0,
    };

    // Process each row
    for (const row of updates) {
      try {
        // Check if we have anything to update
        if (!row.mobileNumber && !row.email) {
          results.push({
            clientName: row.clientName,
            status: "skipped",
            message: "No phone or email provided",
          });
          summary.skipped++;
          continue;
        }

        // Find client by name (case-insensitive exact match)
        const { data: clients, error: findError } = await db
          .from("clients")
          .select("id, full_name, email, phone")
          .eq("agent_id", agent.id)
          .ilike("full_name", row.clientName)
          .limit(1);

        if (findError || !clients || clients.length === 0) {
          results.push({
            clientName: row.clientName,
            status: "not_found",
            message: "Client not found in database",
          });
          summary.notFound++;
          continue;
        }

        const client = clients[0];

        // Build update object
        const updateData: any = {};
        if (row.mobileNumber) {
          updateData.phone = row.mobileNumber;
        }
        if (row.email) {
          updateData.email = row.email;
        }

        // Update client
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
          summary.errors++;
        } else {
          results.push({
            clientName: row.clientName,
            status: "updated",
            phone: row.mobileNumber,
            email: row.email,
          });
          summary.updated++;
        }
      } catch (err) {
        results.push({
          clientName: row.clientName,
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
        summary.errors++;
      }
    }

    // Log the overall activity
    await logActivity(
      agent,
      "bulk_update_mobile_numbers",
      `${summary.updated} of ${summary.total} clients updated from ${file.name}`
    );

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    console.error("[update-mobile-numbers] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
