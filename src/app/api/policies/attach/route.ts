/**
 * Policy Attachment Endpoint
 * 
 * When user uploads a policy PDF:
 * 1. API extracts policy data
 * 2. Returns with metadata showing if MATCH FOUND
 * 3. User confirms attachment
 * 4. This endpoint attaches the policy to the matched client
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
import { permissionsFor } from "@/lib/team";
import { matchPolicyInDatabase, attachPolicyToClient } from "@/lib/policy-db-match";

export const runtime = "nodejs";

/**
 * POST /api/policies/attach
 * 
 * Matches extracted policy with database and attaches it
 */
export async function POST(request: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent || agent.status !== "approved") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!permissionsFor(agent).upload) {
      return NextResponse.json(
        { error: "You don't have permission to attach policies" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const { policy_number, previous_policy_number, client_name, company, product_name, policy_type, sum_insured, premium, start_date, renewal_date, client_address, policy_holder_type, source_file_path } = body;

    if (!policy_number || !client_name || !company) {
      return NextResponse.json(
        { error: "Missing required fields: policy_number, client_name, company" },
        { status: 400 }
      );
    }

    console.log(`[attach] Processing policy: ${policy_number} for ${client_name}`);

    // STEP 1: Match policy with database
    console.log(`[attach] Step 1/2: Matching policy ${policy_number} with database...`);
    
    const matchResult = await matchPolicyInDatabase(
      {
        policy_number,
        previous_policy_number: previous_policy_number || null,
        client_name,
        company,
      },
      agent.id
    );

    console.log(`[attach] Match result:`, {
      matched: matchResult.matched,
      type: matchResult.match_type,
      confidence: matchResult.confidence,
      message: matchResult.message,
    });

    // STEP 2: Attach policy to client
    console.log(`[attach] Step 2/2: Attaching policy to client...`);

    const attachResult = await attachPolicyToClient(
      {
        client_name,
        policy_number,
        previous_policy_number: previous_policy_number || null,
        company,
        product_name: product_name || "Unknown",
        policy_type: policy_type || "Health Insurance",
        sum_insured: sum_insured || 0,
        premium: premium || 0,
        start_date: start_date || "",
        renewal_date: renewal_date || "",
        client_address: client_address || null,
        policy_holder_type: policy_holder_type || null,
      },
      agent.id,
      source_file_path || ""
    );

    if (!attachResult.success) {
      console.error(`[attach] Attachment failed: ${attachResult.message}`);
      return NextResponse.json(
        {
          success: false,
          error: attachResult.message,
          match_found: matchResult.matched,
          match_details: matchResult,
        },
        { status: 400 }
      );
    }

    console.log(`[attach] ✅ Success:`, {
      client_id: attachResult.client_id,
      policy_id: attachResult.policy_id,
      isNewClient: attachResult.isNewClient,
      isNewPolicy: attachResult.isNewPolicy,
    });

    // Return success with all details
    return NextResponse.json({
      success: true,
      message: attachResult.message,
      match_found: matchResult.matched,
      match_type: matchResult.match_type,
      match_confidence: matchResult.confidence,
      match_message: matchResult.message,
      policy: {
        client_id: attachResult.client_id,
        policy_id: attachResult.policy_id,
        policy_number,
        client_name,
        company,
        sum_insured,
        premium,
      },
      status: {
        is_new_client: attachResult.isNewClient || false,
        is_new_policy: attachResult.isNewPolicy || false,
        updated_existing: !attachResult.isNewPolicy && matchResult.matched,
      },
      display_message: attachResult.message, // For UI
    });
  } catch (error) {
    console.error("[attach] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/policies/attach?policy_number=...
 * 
 * Check if a policy matches without attaching
 */
export async function GET(request: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent || agent.status !== "approved") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const policy_number = searchParams.get("policy_number");
    const client_name = searchParams.get("client_name");
    const company = searchParams.get("company");

    if (!policy_number || !client_name || !company) {
      return NextResponse.json(
        { error: "Missing required params: policy_number, client_name, company" },
        { status: 400 }
      );
    }

    // Just do the match check, don't attach
    const matchResult = await matchPolicyInDatabase(
      {
        policy_number,
        previous_policy_number: searchParams.get("previous_policy_number") || null,
        client_name,
        company,
      },
      agent.id
    );

    return NextResponse.json({
      match_found: matchResult.matched,
      match_type: matchResult.match_type,
      confidence: matchResult.confidence,
      message: matchResult.message,
      client_id: matchResult.client_id,
      policy_id: matchResult.policy_id,
    });
  } catch (error) {
    console.error("[attach GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error checking policy match" },
      { status: 500 }
    );
  }
}
