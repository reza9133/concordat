// ============================================================
// GenLayer client setup for Concordat dApp
// Uses genlayer-js with studionet chain
// ============================================================

import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import type {
  HallConfig,
  Rule,
  Standing,
  CaseStatus,
  CasesResult,
  RawStanding,
  RawCaseStatus,
} from '../types';
import { mapStanding, mapCaseStatus } from './mappers';

/** The deployed ConcordatHall contract address */
export const CONTRACT_ADDRESS = (
  import.meta.env.VITE_CONTRACT_ADDRESS || '0x7F0b950E72E9674D5712c13BAe05f4FbA2250Cb5'
) as `0x${string}`;

/**
 * Read-only client — no account needed for view methods.
 */
const readClient = createClient({ chain: studionet });

/**
 * Create a write-capable client bound to a specific sender address.
 * In genlayer-js v1.x, account must be set at client-creation time,
 * not in the writeContract call params.
 */
function writeClient(senderAddress: `0x${string}`) {
  return createClient({
    chain: studionet,
    account: senderAddress,
  });
}

// ---------------------------------------------------------------------------
// Transaction result check
// ---------------------------------------------------------------------------

/**
 * Wait for a transaction receipt and verify the execution succeeded.
 *
 * GenLayer distinguishes between acceptance (consensus on the tx) and
 * execution result. A tx can be ACCEPTED even if the contract raised an
 * error (e.g. "window has closed", "only the owner"). We must check
 * txExecutionResultName === 'FINISHED_WITH_RETURN' to confirm success.
 */
async function waitAndCheck(
  client: ReturnType<typeof createClient>,
  txHash: string,
): Promise<string> {
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  // The receipt shape from genlayer-js — check execution result name
  const execResult = (receipt as Record<string, unknown>).txExecutionResultName as string | undefined;

  if (execResult !== undefined && execResult !== 'FINISHED_WITH_RETURN') {
    // Pull out any contract-level error message when available
    const execErr = (receipt as Record<string, unknown>).txExecutionResult as Record<string, unknown> | undefined;
    const contractMsg = execErr?.error ?? execErr?.message ?? execResult;
    throw new Error(`Contract execution failed: ${contractMsg}`);
  }

  return txHash;
}

// ---------------------------------------------------------------------------
// Hall (read) methods
// ---------------------------------------------------------------------------

/** Fetch the hall configuration */
export async function readGetConfig(): Promise<HallConfig> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_config',
    args: [],
  });
  return result as unknown as HallConfig;
}

/** Fetch all rules from the hall */
export async function readGetRules(): Promise<Rule[]> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_rules',
    args: [],
  });
  return result as unknown as Rule[];
}

/** Fetch standing for a member address — maps raw output to Standing */
export async function readGetStanding(address: string): Promise<Standing> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_standing',
    args: [address],
  });
  return mapStanding(result as unknown as RawStanding);
}

/** Fetch a case registry entry by its address */
export async function readGetCase(caseAddress: string): Promise<unknown> {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_case',
    args: [caseAddress],
  });
}

/** Fetch paginated list of case addresses */
export async function readGetCases(offset: number, limit: number): Promise<string[]> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_cases',
    args: [offset, limit],
  });
  return result as unknown as string[];
}

/** Fetch total number of cases */
export async function readGetCaseCount(): Promise<number> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_case_count',
    args: [],
  });
  return result as unknown as number;
}

/** Fetch all cases with total count */
export async function readGetCasesWithCount(offset = 0, limit = 20): Promise<CasesResult> {
  const [addresses, total] = await Promise.all([
    readGetCases(offset, limit),
    readGetCaseCount(),
  ]);
  return { addresses, total };
}

// ---------------------------------------------------------------------------
// Hall (write) methods
// ---------------------------------------------------------------------------

/** Add a new rule — owner only */
export async function writeAddRule(
  senderAddress: `0x${string}`,
  title: string,
  text: string,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await wc.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'add_rule',
    args: [title, text],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/** Retire an existing rule — owner only */
export async function writeRetireRule(
  senderAddress: `0x${string}`,
  ruleNumber: number,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await wc.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'retire_rule',
    args: [ruleNumber],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/** Forgive points for a member — owner only */
export async function writeForgivePoints(
  senderAddress: `0x${string}`,
  member: string,
  points: number,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await wc.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'forgive_points',
    args: [member, points],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/** File a new case against an accused */
export async function writeFileCase(
  senderAddress: `0x${string}`,
  accused: string,
  ruleNumber: number,
  complaintUrl: string,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await wc.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'file_case',
    args: [accused, ruleNumber, complaintUrl],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

// ---------------------------------------------------------------------------
// Case contract (read) methods
// ---------------------------------------------------------------------------

/** Fetch full case status — maps raw output to CaseStatus */
export async function readCaseStatus(caseAddress: `0x${string}`): Promise<CaseStatus> {
  const result = await readClient.readContract({
    address: caseAddress,
    functionName: 'get_status',
    args: [],
  });
  return mapCaseStatus(result as unknown as RawCaseStatus);
}

/** Check if a ruling can be requested for a case */
export async function readCanRequestRuling(caseAddress: `0x${string}`): Promise<boolean> {
  const result = await readClient.readContract({
    address: caseAddress,
    functionName: 'can_request_ruling',
    args: [],
  });
  return result as unknown as boolean;
}

// ---------------------------------------------------------------------------
// Case contract (write) methods
// ---------------------------------------------------------------------------

/** Submit a defense URL — accused only */
export async function writeCaseSubmitDefense(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`,
  url: string,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await wc.writeContract({
    address: caseAddress,
    functionName: 'submit_defense',
    args: [url],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/** Request an AI ruling on a case — anyone can trigger */
export async function writeCaseRequestRuling(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await wc.writeContract({
    address: caseAddress,
    functionName: 'request_ruling',
    args: [],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/** Appeal a ruling — losing party only */
export async function writeCaseAppeal(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`,
  groundsUrl: string,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await wc.writeContract({
    address: caseAddress,
    functionName: 'appeal',
    args: [groundsUrl],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/** Finalize a case after the appeal window passes */
export async function writeCaseFinalize(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await wc.writeContract({
    address: caseAddress,
    functionName: 'finalize',
    args: [],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/** Abandon a stuck appeal — anyone can call after review window passes */
export async function writeCaseAbandonAppeal(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await wc.writeContract({
    address: caseAddress,
    functionName: 'abandon_appeal',
    args: [],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Format seconds into a human-readable duration string */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

/** Truncate an Ethereum address for display */
export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/**
 * Map raw errors to user-friendly messages.
 * Avoids hiding real errors behind a generic network-switch message.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    const lower = msg.toLowerCase();

    if (lower.includes('user rejected') || lower.includes('user denied')) {
      return 'Transaction rejected by user.';
    }
    if (lower.includes('switch') && lower.includes('network')) {
      return 'Please switch to GenLayer Studionet.';
    }
    if (lower.includes('insufficient funds')) {
      return 'Insufficient funds for this transaction.';
    }
    // Surface contract-level errors (e.g. "[EXPECTED] window has closed") as-is
    return msg;
  }
  return 'An unexpected error occurred.';
}
