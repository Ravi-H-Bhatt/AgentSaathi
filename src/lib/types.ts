export type Role = "agent" | "admin" | "colleague";
export type AgentStatus = "pending" | "approved" | "rejected";

export interface Permissions {
  ai: boolean;
  clients: boolean;
  upload: boolean;
  email: boolean;
}

export const DEFAULT_PERMISSIONS: Permissions = {
  ai: true,
  clients: true,
  upload: true,
  email: true,
};

export interface Agent {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  status: AgentStatus;
  parent_agent_id: string | null;
  permissions: Permissions;
  created_at: string;
}

export interface Invitation {
  id: string;
  agent_id: string;
  token: string;
  email: string | null;
  permissions: Permissions;
  status: "pending" | "accepted" | "revoked";
  accepted_by: string | null;
  created_at: string;
  accepted_at: string | null;
}

export interface TimeEntry {
  id: string;
  agent_id: string;
  owner_id: string;
  clock_in: string;
  clock_out: string | null;
}

export interface ActivityLog {
  id: string;
  agent_id: string;
  owner_id: string;
  action: string;
  detail: string | null;
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
  product_name: string | null;
  client_address: string | null;
  policy_number: string | null;
  sum_insured: number | null;
  premium: number | null;
  /** Premium payment frequency, e.g. Mly/QLY/HLY/YLY/SGL (from register "Mode"). */
  mode: string | null;
  start_date: string | null;
  renewal_date: string | null;
  status: string;
  source_file_path: string | null;
  raw_extract: Record<string, unknown> | null;
  created_at: string;
}

/**
 * One parsed row from a bulk "Policy Register" PDF (many policies in a table).
 * Maps directly to a policy; rows are grouped into clients by name on save.
 */
export interface RegisterRow {
  /** Serial number from the register (for display/ordering only). */
  sn: number | null;
  client_name: string | null;
  client_phone: string | null;
  client_address: string | null;
  /** Insurer / company name, e.g. "New India". Set by format-specific parsers. */
  company?: string | null;
  /** Policy holder type, e.g. "Individual" / "Organizational" (New India premium bill). */
  policy_holder_type?: string | null;
  policy_number: string | null;
  /**
   * Previous/expiring policy number this policy renews (from a policy schedule).
   * Used to auto-map a renewal to the same client that already holds the
   * previous policy, even if the name is written differently.
   */
  previous_policy_number?: string | null;
  /** "Plan" column, e.g. 165/35/35. */
  policy_type: string | null;
  /** Product name like "New India Mediclaim Policy". */
  product_name: string | null;
  /** "Mode" column, e.g. Mly/QLY/HLY/YLY/SGL. */
  mode: string | null;
  /** "D.O.C." (date of commencement) -> start_date, ISO. */
  start_date: string | null;
  /** "F.U.P." (first unpaid premium / next due) -> renewal_date, ISO. */
  renewal_date: string | null;
  premium: number | null;
  sum_insured: number | null;
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
