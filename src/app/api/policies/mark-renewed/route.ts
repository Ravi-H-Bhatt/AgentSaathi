import { NextRequest, NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
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

    // First, verify the policy belongs to this agent
    const { data: policy, error: fetchError } = await db
      .from("policies")
      .select("id, renewal_date")
      .eq("id", policyId)
      .eq("agent_id", agent.id)
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

    // Update the policy with new renewal date
    const { error: updateError } = await db
      .from("policies")
      .update({
        renewal_date: newRenewalDate,
        // Optionally update status if needed
        // status: "renewed"
      })
      .eq("id", policyId)
      .eq("agent_id", agent.id);

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
