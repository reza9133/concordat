// ============================================================
// TypeScript types for Concordat dApp
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

/** A rule in the rulebook */
export interface Rule {
  number: number;
  title: string;
  text: string;
  active: boolean;
}

/** Member standing returned by ConcordatHall.get_standing() */
export interface Standing {
  points: number;
  status: 'good' | 'probation' | 'suspended';
  dismissed_complaints: number;
}

/** Full case status returned by ConcordatCase.get_status() */
export interface CaseStatus {
  case_address: string;
  hall_address: string;
  complainant: string;
  accused: string;
  rule_number: number;
  complaint_url: string;
  defense_url: string | null;
  status: 'open' | 'ruled' | 'under_appeal' | 'final';
  first_ruling: CaseRuling | null;
  final_ruling: CaseRuling | null;
  appeal_grounds_url: string | null;
  appellant: string | null;
  filed_at: number;
  defense_deadline: number;
  ruled_at: number | null;
  appeal_deadline: number | null;
  finalized_at: number | null;
}

/** A ruling outcome */
export interface CaseRuling {
  verdict: 'sustained' | 'dismissed';
  reasoning: string;
  penalty_points: number;
  ruled_at: number;
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
