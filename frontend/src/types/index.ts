// ============================================================
// TypeScript types for Concordat dApp
//
// RAW_* types mirror the exact field names the contracts return.
// The mapped types (HallConfig, Standing, CaseStatus …) are what
// the UI works with. mapStanding() / mapCaseStatus() in
// src/lib/mappers.ts translate between the two.
// ============================================================

/** Configuration returned by ConcordatHall.get_config() */
export interface HallConfig {
  community: string;
  owner: string;
  probation_points: number;
  suspension_points: number;
  max_dismissed_complaints: number;
  defense_window_seconds: number;
  appeal_window_seconds: number;
}

/** A rule in the rulebook — matches contract output directly */
export interface Rule {
  number: number;
  title: string;
  text: string;
  active: boolean;
}

// ---- Raw contract output shapes ----

/**
 * Raw shape returned by ConcordatHall.get_standing().
 * NOTE: status field is called `label` in the contract and uses
 * "good_standing" not "good".
 */
export interface RawStanding {
  points: number;
  /** "good_standing" | "probation" | "suspended" */
  label: string;
  /** number of dismissed complaints the member has filed */
  dismissed_filed: number;
}

/**
 * Raw shape returned by ConcordatCase.get_status().
 * All field names match the Python dataclass exactly.
 */
export interface RawCaseStatus {
  // Parties
  hall: string;
  complainant: string;
  accused: string;
  rule_number: number;
  rule_title: string;
  complaint_url: string;
  defense_url: string;          // "" when none
  opened_at: number;            // unix timestamp
  /** opened_at + defense_window, computed by the contract */
  defense_closes_at: number;
  // Lifecycle
  status: 'open' | 'ruled' | 'under_appeal' | 'final';
  // First-instance ruling fields (all default/zero until ruled)
  first_violation: boolean;
  first_severity: number;
  first_summary: string;
  first_reasoning: string;
  ruled_at: number;             // 0 until ruled
  /** ruled_at + appeal_window, 0 until ruled */
  appeal_closes_at: number;
  // Appeal
  appeal_contract: string;      // zero address until appeal filed
  appellant: string;            // zero address until appeal filed
  appealed_at: number;          // 0 until appeal filed
  /** appealed_at + appeal_window, 0 until appealed */
  review_closes_at: number;
  // Final outcome
  final_violation: boolean;
  final_severity: number;
  final_summary: string;
  final_reasoning: string;
  decided_by: string;           // "" | "first_instance" | "appeal" | "first_instance_appeal_abandoned"
}

// ---- Mapped / UI types ----

/**
 * Member standing — normalised from RawStanding.
 * `status` is a simple three-value enum the UI can switch on.
 */
export interface Standing {
  points: number;
  status: 'good' | 'probation' | 'suspended';
  dismissed_complaints: number;
}

/**
 * Normalised ruling outcome used in CaseStatus.
 * `verdict` is true (violation sustained) or false (dismissed).
 */
export interface CaseRuling {
  /** true = violation upheld, false = complaint dismissed */
  violation: boolean;
  severity: number;   // 0-3
  summary: string;
  reasoning: string;
}

/**
 * Full case status — mapped from RawCaseStatus.
 * Computed deadline timestamps are derived here so the UI doesn't
 * have to re-derive them in every component.
 */
export interface CaseStatus {
  // Identifiers
  hall_address: string;
  complainant: string;
  accused: string;
  rule_number: number;
  rule_title: string;
  // Documents
  complaint_url: string;
  defense_url: string | null;   // null when none
  /** Lives on the appeal contract; null until an appeal is filed */
  appeal_grounds_url: string | null;
  // Lifecycle
  status: 'open' | 'ruled' | 'under_appeal' | 'final';
  opened_at: number;            // unix timestamp
  /** Unix timestamp when defense window closes (opened_at + defense_window) */
  defense_closes_at: number;
  /** Unix timestamp when appeal window closes, null until ruled */
  appeal_closes_at: number | null;
  ruled_at: number | null;      // null until ruled
  // Appeal
  appeal_contract: string | null;
  appellant: string | null;
  appealed_at: number | null;
  /** Unix timestamp when appeal review window closes, null until under_appeal */
  review_closes_at: number | null;
  // Rulings
  first_ruling: CaseRuling | null;   // null until ruled
  final_ruling: CaseRuling | null;   // null until final
  decided_by: string;
}

/** Paginated cases result */
export interface CasesResult {
  addresses: string[];
  total: number;
}

/** Toast notification type */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Toast notification object */
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

/** Wallet state */
export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

/** Ethereum provider interface (EIP-1193) */
export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  selectedAddress?: string | null;
}

/** EIP-6963 provider detail */
export interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: EthereumProvider;
}
