import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/premium/upload-data
 * 
 * Admin endpoint to bulk upload premium data
 * Accepts JSON array of premium records
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { table, data } = await req.json();

    if (!table || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Invalid request. Provide 'table' and 'data' array" },
        { status: 400 }
      );
    }

    // Validate table name
    const allowedTables = [
      "nia_mediclaim_individual",
      "nia_mediclaim_floater",
      "nia_optional_cover_i",
      "nia_optional_cover_ii",
      "nia_optional_cover_iii",
      "nia_topup_mediclaim",
    ];

    if (!allowedTables.includes(table)) {
      return NextResponse.json(
        { error: `Invalid table name. Allowed: ${allowedTables.join(", ")}` },
        { status: 400 }
      );
    }

    // Insert data with upsert
    const { error: insertError, count } = await supabase
      .from(table)
      .upsert(data, { onConflict: getConflictColumns(table) });

    if (insertError) {
      console.error("[PREMIUM_UPLOAD_ERROR]", insertError);
      return NextResponse.json(
        { error: "Failed to upload data", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      table,
      recordsUpserted: count || data.length,
    });
  } catch (error: any) {
    console.error("[PREMIUM_UPLOAD_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload premium data" },
      { status: 500 }
    );
  }
}

/**
 * Get conflict columns for upsert based on table
 */
function getConflictColumns(table: string): string {
  const conflictMap: Record<string, string> = {
    nia_mediclaim_individual: "zone,age_min,age_max,sum_insured",
    nia_mediclaim_floater: "zone,age_min,age_max,sum_insured",
    nia_optional_cover_i: "sum_insured,age_band",
    nia_optional_cover_ii: "sum_insured",
    nia_optional_cover_iii: "sum_insured,age_band",
    nia_topup_mediclaim: "threshold,sum_insured,member_type,age_band",
  };
  return conflictMap[table] || "id";
}
