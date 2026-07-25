/**
 * New India Assurance Premium Calculator
 * 
 * Database-driven premium calculation engine that fetches exact premiums
 * from stored premium tables instead of using formulas or estimates.
 * 
 * NO PDF uploads required at runtime.
 * ALL premiums are looked up from database tables.
 */

import { createClient } from "@/lib/supabase/server";

export type PolicyType = "individual" | "floater" | "topup";
export type Zone = "zone1" | "zone2";

export interface IndividualMediclaimInput {
  policyType: "individual";
  age: number;
  sumInsured: number;
  zone: Zone;
  optionalCoverI?: boolean;
  optionalCoverII?: boolean;
  optionalCoverIII?: boolean;
  voluntaryCoPay?: boolean; // 20% co-pay gives 15% discount
  optionalCoverV?: boolean; // Non-medical items
  policyTerm: 1 | 2 | 3; // Years
}

export interface FloaterMediclaimInput {
  policyType: "floater";
  eldestAge: number;
  sumInsured: number;
  zone: Zone;
  numberOfMembers: number;
  memberAges?: number[]; // Individual ages of all members (optional for backwards compatibility)
  optionalCoverI?: boolean;
  optionalCoverII?: boolean;
  optionalCoverIII?: boolean;
  voluntaryCoPay?: boolean;
  optionalCoverV?: boolean;
  policyTerm: 1 | 2 | 3;
}

export interface TopUpMediclaimInput {
  policyType: "topup";
  threshold: number;
  sumInsured: number;
  memberAges: number[]; // Simple array of ages - no primary/additional distinction
}

export type PremiumInput = IndividualMediclaimInput | FloaterMediclaimInput | TopUpMediclaimInput;

export interface PremiumBreakdown {
  policyType: string;
  basePremium: number;
  memberPremiums?: Array<{ age: number; premium: number; memberType?: "primary" | "additional" }>; // For floater/topup: individual member premiums
  optionalCoverI?: number;
  optionalCoverII?: number;
  optionalCoverIII?: number;
  optionalCoverV?: number;
  voluntaryCoPay?: number; // This will be negative (discount)
  familyDiscount?: number; // Negative for floater
  longTermDiscount?: number; // Negative
  subtotal: number;
  gst: number; // Always 0 for display
  totalPremium: number;
  details: {
    age?: number;
    eldestAge?: number;
    sumInsured: number;
    zone?: Zone;
    numberOfMembers?: number;
    policyTerm: number;
  };
}

/**
 * Get age band for optional covers
 */
function getAgeBand(age: number): string {
  if (age < 35) return "<35";
  if (age <= 45) return "36-45";
  if (age <= 50) return "46-50";
  if (age <= 55) return "51-55";
  if (age <= 60) return "56-60";
  if (age <= 65) return "61-65";
  return ">65";
}

/**
 * Calculate Individual Mediclaim Premium
 */
async function calculateIndividualPremium(
  input: IndividualMediclaimInput
): Promise<PremiumBreakdown> {
  const db = await createClient();

  // 1. Fetch base premium
  const { data: basePremiumData, error: baseError } = await db
    .from("nia_mediclaim_individual")
    .select("premium")
    .eq("zone", input.zone)
    .lte("age_min", input.age)
    .gte("age_max", input.age)
    .eq("sum_insured", input.sumInsured)
    .single();

  if (baseError || !basePremiumData) {
    throw new Error(
      `Premium not available for age ${input.age} and sum insured ₹${input.sumInsured.toLocaleString("en-IN")}`
    );
  }

  let basePremium = basePremiumData.premium;
  let optionalCoverI = 0;
  let optionalCoverII = 0;
  let optionalCoverIII = 0;
  let optionalCoverV = 0;
  let voluntaryCoPay = 0;

  // 2. Optional Cover I - No Proportionate Deduction
  if (input.optionalCoverI) {
    const ageBand = getAgeBand(input.age);
    const { data } = await db
      .from("nia_optional_cover_i")
      .select("premium")
      .eq("sum_insured", input.sumInsured)
      .eq("age_band", ageBand)
      .maybeSingle();

    if (data) {
      optionalCoverI = data.premium;
    }
  }

  // 3. Optional Cover II - Maternity Benefit
  if (input.optionalCoverII) {
    const { data } = await db
      .from("nia_optional_cover_ii")
      .select("premium")
      .eq("sum_insured", input.sumInsured)
      .maybeSingle();

    if (data) {
      optionalCoverII = data.premium;
    }
  }

  // 4. Optional Cover III - Revision in Cataract Limit
  if (input.optionalCoverIII && input.sumInsured >= 800000) {
    const ageBand = getAgeBand(input.age);
    const { data } = await db
      .from("nia_optional_cover_iii")
      .select("premium")
      .eq("sum_insured", input.sumInsured)
      .eq("age_band", ageBand)
      .maybeSingle();

    if (data) {
      optionalCoverIII = data.premium;
    }
  }

  // 5. Optional Cover V - Non-Medical Items
  if (input.optionalCoverV && input.sumInsured >= 800000) {
    const { data } = await db
      .from("premium_config")
      .select("value")
      .eq("key", "optional_cover_v_premium")
      .single();

    if (data) {
      optionalCoverV = parseInt(data.value as string);
    }
  }

  // 6. Voluntary Co-Pay Discount (15% on base premium only)
  if (input.voluntaryCoPay) {
    const { data } = await db
      .from("premium_config")
      .select("value")
      .eq("key", "voluntary_copay_discount")
      .single();

    if (data) {
      const discountPercent = parseInt(data.value as string);
      voluntaryCoPay = -Math.round((basePremium * discountPercent) / 100);
    }
  }

  // 7. Long-term discount
  let longTermDiscount = 0;
  if (input.policyTerm > 1) {
    const { data } = await db
      .from("premium_config")
      .select("value")
      .eq("key", "long_term_discount")
      .single();

    if (data) {
      const discounts = data.value as Record<string, number>;
      const discountPercent = discounts[input.policyTerm.toString()] || 0;
      const subtotalBeforeDiscount =
        basePremium + voluntaryCoPay + optionalCoverI + optionalCoverII + optionalCoverIII + optionalCoverV;
      longTermDiscount = -Math.round((subtotalBeforeDiscount * discountPercent) / 100);
    }
  }

  const subtotal =
    basePremium +
    voluntaryCoPay +
    optionalCoverI +
    optionalCoverII +
    optionalCoverIII +
    optionalCoverV +
    longTermDiscount;

  return {
    policyType: "Individual Mediclaim",
    basePremium,
    optionalCoverI: optionalCoverI || undefined,
    optionalCoverII: optionalCoverII || undefined,
    optionalCoverIII: optionalCoverIII || undefined,
    optionalCoverV: optionalCoverV || undefined,
    voluntaryCoPay: voluntaryCoPay || undefined,
    longTermDiscount: longTermDiscount || undefined,
    subtotal,
    gst: 0,
    totalPremium: subtotal,
    details: {
      age: input.age,
      sumInsured: input.sumInsured,
      zone: input.zone,
      policyTerm: input.policyTerm,
    },
  };
}

/**
 * Calculate Floater Mediclaim Premium
 * For floater policies, we need to calculate premium for each member and sum them up
 */
async function calculateFloaterPremium(
  input: FloaterMediclaimInput
): Promise<PremiumBreakdown> {
  const db = await createClient();

  // IMPORTANT: For floater mediclaim, each member needs their own premium calculated
  // Then all member premiums are summed to get the total base premium
  
  let basePremium = 0;
  const memberPremiums: Array<{ age: number; premium: number }> = [];
  const memberAges = input.memberAges || [input.eldestAge]; // Fallback for backwards compatibility
  
  // Calculate premium for each member
  for (const memberAge of memberAges) {
    const { data: memberPremiumData, error: memberError } = await db
      .from("nia_mediclaim_floater")
      .select("premium")
      .eq("zone", input.zone)
      .lte("age_min", memberAge)
      .gte("age_max", memberAge)
      .eq("sum_insured", input.sumInsured)
      .single();

    if (memberError || !memberPremiumData) {
      throw new Error(
        `Premium not available for member age ${memberAge} and sum insured ₹${input.sumInsured.toLocaleString("en-IN")}`
      );
    }
    
    // Track individual member premium
    const memberPremium = memberPremiumData.premium;
    memberPremiums.push({ age: memberAge, premium: memberPremium });
    
    // Add this member's premium to the total
    basePremium += memberPremium;
  }

  let optionalCoverI = 0;
  let optionalCoverII = 0;
  let optionalCoverIII = 0;
  let optionalCoverV = 0;
  let voluntaryCoPay = 0;

  // 2-5. Optional covers (calculated on eldest age as per policy)
  if (input.optionalCoverI) {
    const ageBand = getAgeBand(input.eldestAge);
    const { data } = await db
      .from("nia_optional_cover_i")
      .select("premium")
      .eq("sum_insured", input.sumInsured)
      .eq("age_band", ageBand)
      .maybeSingle();
    if (data) optionalCoverI = data.premium;
  }

  if (input.optionalCoverII) {
    const { data } = await db
      .from("nia_optional_cover_ii")
      .select("premium")
      .eq("sum_insured", input.sumInsured)
      .maybeSingle();
    if (data) optionalCoverII = data.premium;
  }

  if (input.optionalCoverIII && input.sumInsured >= 800000) {
    const ageBand = getAgeBand(input.eldestAge);
    const { data } = await db
      .from("nia_optional_cover_iii")
      .select("premium")
      .eq("sum_insured", input.sumInsured)
      .eq("age_band", ageBand)
      .maybeSingle();
    if (data) optionalCoverIII = data.premium;
  }

  if (input.optionalCoverV && input.sumInsured >= 800000) {
    const { data } = await db
      .from("premium_config")
      .select("value")
      .eq("key", "optional_cover_v_premium")
      .single();
    if (data) optionalCoverV = parseInt(data.value as string) * input.numberOfMembers;
  }

  // 6. Voluntary Co-Pay (on base premium only)
  if (input.voluntaryCoPay) {
    const { data } = await db
      .from("premium_config")
      .select("value")
      .eq("key", "voluntary_copay_discount")
      .single();
    if (data) {
      const discountPercent = parseInt(data.value as string);
      voluntaryCoPay = -Math.round((basePremium * discountPercent) / 100);
    }
  }

  // 7. Family discount (5% for 2 members, 10% for 3 members, 15% for 4+ members)
  let familyDiscount = 0;
  if (input.numberOfMembers >= 2) {
    const { data } = await db
      .from("premium_config")
      .select("value")
      .eq("key", "floater_discount")
      .single();

    if (data) {
      const discounts = data.value as Record<string, number>;
      // Map members: 2->5%, 3->10%, 4+->15%
      const memberKey = input.numberOfMembers >= 4 ? "4" : input.numberOfMembers.toString();
      const discountPercent = discounts[memberKey] || 0;
      
      if (discountPercent > 0) {
        const subtotalBeforeDiscount =
          basePremium + voluntaryCoPay + optionalCoverI + optionalCoverII + optionalCoverIII + optionalCoverV;
        familyDiscount = -Math.round((subtotalBeforeDiscount * discountPercent) / 100);
      }
    }
  }

  // 8. Long-term discount
  let longTermDiscount = 0;
  if (input.policyTerm > 1) {
    const { data } = await db
      .from("premium_config")
      .select("value")
      .eq("key", "long_term_discount")
      .single();
    if (data) {
      const discounts = data.value as Record<string, number>;
      const discountPercent = discounts[input.policyTerm.toString()] || 0;
      const subtotalBeforeDiscount =
        basePremium +
        voluntaryCoPay +
        optionalCoverI +
        optionalCoverII +
        optionalCoverIII +
        optionalCoverV +
        familyDiscount;
      longTermDiscount = -Math.round((subtotalBeforeDiscount * discountPercent) / 100);
    }
  }

  const subtotal =
    basePremium +
    voluntaryCoPay +
    optionalCoverI +
    optionalCoverII +
    optionalCoverIII +
    optionalCoverV +
    familyDiscount +
    longTermDiscount;

  return {
    policyType: "Floater Mediclaim",
    basePremium,
    memberPremiums, // Include individual member premiums for display
    optionalCoverI: optionalCoverI || undefined,
    optionalCoverII: optionalCoverII || undefined,
    optionalCoverIII: optionalCoverIII || undefined,
    optionalCoverV: optionalCoverV || undefined,
    voluntaryCoPay: voluntaryCoPay || undefined,
    familyDiscount: familyDiscount || undefined,
    longTermDiscount: longTermDiscount || undefined,
    subtotal,
    gst: 0,
    totalPremium: subtotal,
    details: {
      eldestAge: input.eldestAge,
      sumInsured: input.sumInsured,
      zone: input.zone,
      numberOfMembers: input.numberOfMembers,
      policyTerm: input.policyTerm,
    },
  };
}

/**
 * Get age band for top-up mediclaim
 * Map ages to the exact bands available in database
 */
function getTopUpAgeBand(age: number): string {
  if (age < 18) return "0-17";
  if (age <= 44) return "18-44";
  if (age <= 54) return "45-54";
  if (age <= 60) return "55-60";
  // Ages 61+ use 61-65 band (highest available)
  return "61-65";
}

/**
 * Calculate Top-Up Mediclaim Premium
 * 
 * CRITICAL FIX: Implement Primary vs Additional Member Logic
 * - Eldest member = PRIMARY member (higher rate)
 * - All other members = ADDITIONAL members (lower rate)
 * 
 * Example (CORRECT):
 *   Eldest (47): PRIMARY rate = 4,500
 *   Age 35: ADDITIONAL rate = 1,400
 *   Age 32: ADDITIONAL rate = 1,400
 *   Total: 7,300 ✓
 * 
 * (NOT treating everyone as ADDITIONAL like before)
 */
async function calculateTopUpPremium(
  input: TopUpMediclaimInput
): Promise<PremiumBreakdown> {
  const db = await createClient();

  // Validation: must have at least 1 member
  if (!input.memberAges || input.memberAges.length === 0) {
    throw new Error("At least one member is required for Top-Up Mediclaim");
  }

  // CRITICAL: Find the eldest member (PRIMARY)
  const eldestAge = Math.max(...input.memberAges);
  
  const memberPremiums: Array<{ age: number; premium: number; memberType: "primary" | "additional" }> = [];
  let basePremium = 0;

  // Process each member
  for (const age of input.memberAges) {
    const ageBand = getTopUpAgeBand(age);
    
    // CRITICAL LOGIC: Determine if this is PRIMARY or ADDITIONAL
    const isPrimary = age === eldestAge && !memberPremiums.some(m => m.memberType === "primary");
    const memberType: "primary" | "additional" = isPrimary ? "primary" : "additional";

    const { data: memberData, error: memberError } = await db
      .from("nia_topup_mediclaim")
      .select("premium")
      .eq("threshold", input.threshold)
      .eq("sum_insured", input.sumInsured)
      .eq("member_type", memberType)  // PRIMARY or ADDITIONAL
      .eq("age_band", ageBand)
      .maybeSingle();

    if (memberError || !memberData) {
      throw new Error(
        `Premium not available for ${memberType} member age ${age} (Band: ${ageBand}), Threshold ₹${input.threshold.toLocaleString("en-IN")}, Sum Insured ₹${input.sumInsured.toLocaleString("en-IN")}`
      );
    }

    memberPremiums.push({ age, premium: memberData.premium, memberType });
    basePremium += memberData.premium;
  }

  return {
    policyType: "Top-Up Mediclaim",
    basePremium,
    memberPremiums, // Show each member's age, type, and premium
    subtotal: basePremium,
    gst: 0,
    totalPremium: basePremium,
    details: {
      sumInsured: input.sumInsured,
      policyTerm: 1,
    },
  };
}

/**
 * Main Premium Calculator Entry Point
 */
export async function calculatePremium(
  input: PremiumInput
): Promise<PremiumBreakdown> {
  switch (input.policyType) {
    case "individual":
      return calculateIndividualPremium(input);
    case "floater":
      return calculateFloaterPremium(input);
    case "topup":
      return calculateTopUpPremium(input);
    default:
      throw new Error("Invalid policy type");
  }
}
