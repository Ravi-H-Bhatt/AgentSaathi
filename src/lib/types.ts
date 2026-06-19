export type Role = "agent" | "admin";
export type AgentStatus = "pending" | "approved" | "rejected";

export interface Agent {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  status: AgentStatus;
  created_at: string;
}

export interface Client {
  id: string;
  agent_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  age: number | null;
  notes: string | null;
  created_at: string;
}

export interface Policy {
  id: string;
  agent_id: string;
  client_id: string;
  company: string | null;
  policy_type: string | null;
  policy_number: string | null;
  sum_insured: number | null;
  premium: number | null;
  start_date: string | null;
  renewal_date: string | null;
  status: string;
  source_file_path: string | null;
  raw_extract: Record<string, unknown> | null;
  created_at: string;
}

export interface PremiumChart {
  id: string;
  policy_type: string | null;
  age_min: number;
  age_max: number;
  sum_insured: number | null;
  premium: number;
  notes: string | null;
  created_at: string;
}

export interface ClientWithPolicies extends Client {
  policies: Policy[];
}

/** Shape returned by the PDF extraction step (pre-save, editable). */
export interface ExtractedPolicy {
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  date_of_birth: string | null;
  age: number | null;
  company: string | null;
  policy_type: string | null;
  policy_number: string | null;
  sum_insured: number | null;
  premium: number | null;
  start_date: string | null;
  renewal_date: string | null;
  /** Fields the model was not confident about. */
  low_confidence_fields: string[];
}
