import { NextRequest, NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor } from "@/lib/team";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLicNextDueISO } from "@/lib/lic-renewal";

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

    // First, verify the policy belongs to this owner (fetch mode + raw_extract).
    const { data: policy, error: fetchError } = await db
      .from("policies")
      .select("id, start_date, renewal_date, mode, raw_extract")
      .eq("id", policyId)
      .eq("agent_id", ownerId)
      .single();

    if (fetchError || !policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const existingRaw =
      (policy.raw_extract as Record<string, unknown> | null) || {};
    const isLic = existingRaw.source === "lic_premium_due";

    let newRenewalDate: string;
    let newRaw: Record<string, unknown>;

    if (isLic) {
      // LIC: schedule is derived from D.o.C + mode. "Collected" marks the
      // CURRENT due installment as paid (paid_through) so the policy rolls to
      // the next cycle — a monthly policy reappears next month, a quarterly one
      // next quarter, etc. No long "renewed_at" hide.
      const doc = policy.start_date || policy.renewal_date;
      const prevPaid =
        (existingRaw.paid_through as string | undefined) || null;
      // The installment being collected now.
      const collected = getLicNextDueISO(doc, policy.mode, new Date(), prevPaid);
      // The following due after this collection.
      const following =
        getLicNextDueISO(doc, policy.mode, new Date(), collected) || collected;
      newRenewalDate =
        following || collected || new Date().toISOString().split("T")[0];
      const { renewed_at: _drop, ...rest } = existingRaw;
      newRaw = {
        ...rest,
        paid_through: collected,
        fup: following
          ? `${following.slice(5, 7)}/${following.slice(0, 4)}`
          : (rest.fup as string | undefined) ?? null,
      };
    } else {
      // Annual (Home) policies: roll to next year and hide for this cycle.
      if (policy.renewal_date) {
        const nextRenewal = new Date(policy.renewal_date);
        nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
        newRenewalDate = nextRenewal.toISOString().split("T")[0];
      } else {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        newRenewalDate = nextYear.toISOString().split("T")[0];
      }
      newRaw = { ...existingRaw, renewed_at: new Date().toISOString() };
    }

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
