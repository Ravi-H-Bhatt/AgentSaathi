import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/policies/motor
 * Update motor-specific fields for a policy
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      policyId,
      sum_insured,
      policy_number,
      vehicle_make,
      vehicle_model,
      registration_number,
      year_of_registration,
      cubic_capacity,
    } = body;

    if (!policyId) {
      return NextResponse.json(
        { error: "Policy ID is required" },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    
    if (sum_insured !== undefined) updates.sum_insured = sum_insured;
    if (policy_number !== undefined) updates.policy_number = policy_number;
    if (vehicle_make !== undefined) updates.vehicle_make = vehicle_make;
    if (vehicle_model !== undefined) updates.vehicle_model = vehicle_model;
    if (registration_number !== undefined) updates.registration_number = registration_number;
    if (year_of_registration !== undefined) updates.year_of_registration = year_of_registration;
    if (cubic_capacity !== undefined) updates.cubic_capacity = cubic_capacity;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update the policy
    const { data: policy, error } = await supabase
      .from("policies")
      .update(updates)
      .eq("id", policyId)
      .eq("agent_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ policy });
  } catch (error) {
    console.error("Motor policy update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update policy" },
      { status: 500 }
    );
  }
}
