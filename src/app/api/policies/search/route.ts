import { NextRequest, NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor } from "@/lib/team";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspace } from "@/lib/workspace";

export async function GET(request: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const policyNumber = searchParams.get("policy_number");

    if (!policyNumber) {
      return NextResponse.json(
        { error: "Policy number is required" },
        { status: 400 }
      );
    }

    const ownerId = ownerIdFor(agent);
    const workspace = await getWorkspace();
    const db = createAdminClient();

    // Search for policy by policy_number (exact match, case-insensitive)
    const { data: policies } = await db
      .from("policies")
      .select("id, client_id, policy_number")
      .eq("agent_id", ownerId)
      .eq("workspace", workspace)
      .ilike("policy_number", policyNumber.trim())
      .limit(1);

    if (!policies || policies.length === 0) {
      return NextResponse.json({
        found: false,
      });
    }

    const policy = policies[0];

    // Get client details
    const { data: client } = await db
      .from("clients")
      .select("id, full_name")
      .eq("id", policy.client_id)
      .eq("agent_id", ownerId)
      .eq("workspace", workspace)
      .maybeSingle();

    return NextResponse.json({
      found: true,
      clientName: client?.full_name || "Unknown Client",
      clientId: client?.id,
      policyId: policy.id,
    });
  } catch (error) {
    console.error("Policy search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
