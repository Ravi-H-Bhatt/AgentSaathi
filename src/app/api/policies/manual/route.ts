import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { getWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/policies/manual
 * Create a policy manually without file upload
 * Required: client_name, policy_number, company, product_name (from header/LOB), start_date, renewal_date
 * Optional: all other fields
 */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!permissionsFor(agent).clients) {
    return NextResponse.json(
      { error: "You don't have permission to manage policies." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const db = createAdminClient();
  const workspace = await getWorkspace();

  // MANDATORY fields validation
  const { client_name, policy_number, company, product_name, start_date, renewal_date } = body;

  if (!client_name || !policy_number || !company || !product_name || !start_date || !renewal_date) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        required: ["client_name", "policy_number", "company", "product_name", "start_date", "renewal_date"],
      },
      { status: 400 }
    );
  }

  try {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(renewal_date)) {
      return NextResponse.json(
        { error: "Dates must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Ensure renewal_date is after start_date
    if (new Date(renewal_date) <= new Date(start_date)) {
      return NextResponse.json(
        { error: "Renewal date must be after start date" },
        { status: 400 }
      );
    }

    // Find or create client
    const { data: existingClients, error: searchError } = await db
      .from("clients")
      .select("id")
      .eq("agent_id", agent.id)
      .eq("workspace", workspace)
      .ilike("full_name", `%${client_name}%`)
      .limit(1);

    if (searchError) throw searchError;

    let clientId: string;

    if (existingClients && existingClients.length > 0) {
      clientId = existingClients[0].id;
    } else {
      // Create new client
      const { data: newClient, error: createError } = await db
        .from("clients")
        .insert({
          agent_id: agent.id,
          full_name: client_name,
          phone: body.client_phone || null,
          email: body.client_email || null,
          date_of_birth: body.date_of_birth || null,
          age: body.age || null,
          workspace,
        })
        .select("id")
        .single();

      if (createError) throw createError;
      if (!newClient) throw new Error("Failed to create client");

      clientId = newClient.id;
    }

    // Create policy
    const { data: policy, error: policyError } = await db
      .from("policies")
      .insert({
        agent_id: agent.id,
        client_id: clientId,
        workspace,
        company: company,
        policy_type: body.policy_type || null,
        product_name: product_name,
        client_address: body.client_address || null,
        policy_number: policy_number,
        sum_insured: body.sum_insured || null,
        premium: body.premium || null,
        mode: body.mode || null,
        start_date: start_date,
        renewal_date: renewal_date,
        status: "active",
        raw_extract: {
          manual_entry: true,
          entered_at: new Date().toISOString(),
          ...body,
        },
      })
      .select()
      .single();

    if (policyError) throw policyError;
    if (!policy) throw new Error("Failed to create policy");

    await logActivity(agent, "create_policy_manual", `${policy_number} for ${client_name}`, workspace);

    return NextResponse.json({
      success: true,
      policy: policy,
      message: `Policy ${policy_number} created successfully for ${client_name}`,
    });
  } catch (err) {
    console.error("[manual-policy] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create policy" },
      { status: 500 }
    );
  }
}
