import { NextRequest, NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor } from "@/lib/team";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/policies/mark-renewed
 * Marks a policy as renewed by updating its renewal_date to next year
 * and optionally updating status to "renewed"
 */
export async function POST(req: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { policyId } = body;

    if (!policyId) {
      return NextResponse.json({ error: "policyId is required" }, { status: 400 });
    }

    const db = createAdminClient();
    const ownerId = ownerIdFor(agent);

    // First, verify the policy belongs to this owner (fetch raw_extract too).
    const { data: policy, error: fetchError } = await db
      .from("policies")
      .select("id, renewal_date, raw_extract")
      .eq("id", policyId)
      .eq("agent_id", ownerId)
      .single();

    if (fetchError || !policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // Calculate next year's renewal date
    let newRenewalDate: string;
    if (policy.renewal_date) {
      const currentRenewal = new Date(policy.renewal_date);
      const nextRenewal = new Date(currentRenewal);
      nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
      newRenewalDate = nextRenewal.toISOString().split('T')[0];
    } else {
      // If no renewal date, set it to one year from now
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      newRenewalDate = nextYear.toISOString().split('T')[0];
    }

    // Store the "renewed" marker INSIDE the existing raw_extract jsonb column
    // (no schema change needed). This makes the policy drop off the renewals
    // list for this cycle. It naturally returns next year.
    const existingRaw =
      (policy.raw_extract as Record<string, unknown> | null) || {};
    const newRaw = { ...existingRaw, renewed_at: new Date().toISOString() };

    const { error: updateError } = await db
      .from("policies")
      .update({ renewal_date: newRenewalDate, raw_extract: newRaw })
      .eq("id", policyId)
      .eq("agent_id", ownerId);

    if (updateError) {
      console.error("Error updating policy:", updateError);
      return NextResponse.json(
        { error: "Failed to update policy" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Policy marked as renewed",
      newRenewalDate,
    });
  } catch (error) {
    console.error("Error in mark-renewed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
