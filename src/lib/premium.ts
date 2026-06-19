import type { Client, Policy, PremiumChart } from "@/lib/types";

export interface PremiumProjection {
  policyId: string;
  policyType: string | null;
  currentPremium: number | null;
  projectedPremium: number;
  effectiveDate: string; // date the new age band begins
  newAge: number;
}

/** Compute a client's age from DOB (fallback to stored age). */
export function computeAge(client: Pick<Client, "date_of_birth" | "age">): number | null {
  if (client.date_of_birth) {
    const dob = new Date(client.date_of_birth);
    if (!isNaN(dob.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
      return age;
    }
  }
  return client.age ?? null;
}

/** Date of the client's next birthday (when their age changes). */
function nextBirthday(dob: string): string | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next <= now) next.setFullYear(now.getFullYear() + 1);
  return next.toISOString().slice(0, 10);
}

function findBand(
  charts: PremiumChart[],
  policyType: string | null,
  age: number
): PremiumChart | null {
  const matches = charts.filter(
    (c) =>
      age >= c.age_min &&
      age <= c.age_max &&
      (!policyType ||
        !c.policy_type ||
        c.policy_type.toLowerCase() === policyType.toLowerCase())
  );
  return matches[0] ?? null;
}

/**
 * For each policy, project whether the premium will change when the client
 * crosses into the next age band (per the admin charts).
 */
export function projectPremiumChanges(
  client: Client,
  policies: Policy[],
  charts: PremiumChart[]
): PremiumProjection[] {
  const out: PremiumProjection[] = [];
  if (!client.date_of_birth || charts.length === 0) return out;

  const age = computeAge(client);
  if (age == null) return out;

  const effective = nextBirthday(client.date_of_birth);
  if (!effective) return out;

  for (const policy of policies) {
    const currentBand = findBand(charts, policy.policy_type, age);
    const futureBand = findBand(charts, policy.policy_type, age + 1);
    if (!futureBand) continue;

    const currentPremium = policy.premium ?? currentBand?.premium ?? null;
    if (currentPremium != null && futureBand.premium === currentPremium) continue;

    out.push({
      policyId: policy.id,
      policyType: policy.policy_type,
      currentPremium,
      projectedPremium: futureBand.premium,
      effectiveDate: effective,
      newAge: age + 1,
    });
  }
  return out;
}
