/**
 * Motor policy utilities for AgentSaathi
 */

/**
 * Motor policy keywords based on Indian general insurance naming conventions
 */
const MOTOR_KEYWORDS = [
  "CAR",
  "PVT CAR",
  "PRIVATE CAR",
  "TWO WHEELER",
  "BIKE",
  "SCOOTER",
  "GCV",
  "PCV",
  "COMMERCIAL VEHICLE",
  "GOODS CARRYING",
  "PASSENGER CARRYING",
  "TRACTOR",
  "MISC",
  "MOTOR",
  "PACKAGE",
  "STANDALONE OD",
  "STANDALONE TP",
  "LIABILITY",
  "OWN DAMAGE",
  "OD",
  "TP",
  "MOTORCYCLE",
  "VEHICLE"
];

/**
 * Check if a policy is a motor policy based on its type
 */
export function isMotorPolicy(policyType: string | null | undefined): boolean {
  if (!policyType) return false;
  
  const upperType = policyType.toUpperCase();
  return MOTOR_KEYWORDS.some(keyword => upperType.includes(keyword));
}

/**
 * Get the list of motor-specific fields that are missing from a policy
 */
export function getMissingMotorFields(policy: {
  sum_insured: number | null;
  policy_number: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  registration_number: string | null;
  year_of_registration: number | null;
  cubic_capacity: number | null;
}): string[] {
  const missing: string[] = [];
  
  if (!policy.sum_insured) missing.push("sum_insured");
  if (!policy.policy_number) missing.push("policy_number");
  if (!policy.vehicle_make) missing.push("vehicle_make");
  if (!policy.registration_number) missing.push("registration_number");
  if (!policy.year_of_registration) missing.push("year_of_registration");
  
  return missing;
}

/**
 * Check if a policy needs motor data entry
 */
export function needsMotorDataEntry(policy: {
  policy_type: string | null;
  sum_insured: number | null;
  policy_number: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  registration_number: string | null;
  year_of_registration: number | null;
  cubic_capacity: number | null;
}): boolean {
  if (!isMotorPolicy(policy.policy_type)) return false;
  return getMissingMotorFields(policy).length > 0;
}
