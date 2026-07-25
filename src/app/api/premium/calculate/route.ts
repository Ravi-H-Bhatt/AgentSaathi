import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculatePremium, type PremiumInput } from "@/lib/premium-calculator";

/**
 * POST /api/premium/calculate
 * 
 * Calculate insurance premium based on policy type and inputs
 * This is a database-driven calculator - NO PDF uploads required
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

    // Parse request body
    const input = (await req.json()) as PremiumInput;

    // Validate input
    if (!input.policyType) {
      return NextResponse.json(
        { error: "Policy type is required" },
        { status: 400 }
      );
    }

    // Calculate premium using database-driven calculator
    const breakdown = await calculatePremium(input);

    return NextResponse.json(breakdown);
  } catch (error: any) {
    console.error("[PREMIUM_CALCULATE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate premium" },
      { status: 500 }
    );
  }
}
