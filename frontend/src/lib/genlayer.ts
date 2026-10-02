// ============================================================
// GenLayer client setup for Concordat dApp
// Uses genlayer-js with studionet chain
// ============================================================

import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import type { HallConfig, Rule, Standing, CaseStatus, CasesResult } from '../types';

/** The deployed ConcordatHall contract address */
export const CONTRACT_ADDRESS = (
  import.meta.env.VITE_CONTRACT_ADDRESS || '0x7F0b950E72E9674D5712c13BAe05f4FbA2250Cb5'
) as `0x${string}`;

/** GenLayer JS client connected to studionet */
export const client = createClient({
  chain: studionet,
});

// ---- Hall (read) methods ----

/** Fetch the hall configuration */
export async function readGetConfig(): Promise<HallConfig> {
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_config',
    args: [],
  });
  return result as HallConfig;
}

/** Fetch all rules from the hall */
export async function readGetRules(): Promise<Rule[]> {
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_rules',
    args: [],
  });
  return result as Rule[];
}

/** Fetch standing for a member address */
export async function readGetStanding(address: string): Promise<Standing> {
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_standing',
    args: [address],
  });
  return result as Standing;
}

/** Fetch a case registry entry by its address */
export async function readGetCase(caseAddress: string): Promise<unknown> {
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_case',
    args: [caseAddress],
  });
  return result;
}

/** Fetch paginated list of case addresses */
export async function readGetCases(offset: number, limit: number): Promise<string[]> {
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_cases',
    args: [offset, limit],
  });
  return result as string[];
}

/** Fetch total number of cases */
export async function readGetCaseCount(): Promise<number> {
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_case_count',
    args: [],
  });
  return result as number;
}

/** Fetch all cases with total count */
export async function readGetCasesWithCount(offset = 0, limit = 20): Promise<CasesResult> {
  const [addresses, total] = await Promise.all([
    readGetCases(offset, limit),
    readGetCaseCount(),
  ]);
  return { addresses, total };
}

// ---- Hall (write) methods ----

/** Add a new rule — owner only */
export async function writeAddRule(
  senderAddress: `0x${string}`,
  title: string,
  text: string
): Promise<string> {
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'add_rule',
    args: [title, text],
    account: senderAddress,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/** Retire an existing rule — owner only */
export async function writeRetireRule(
  senderAddress: `0x${string}`,
  ruleNumber: number
): Promise<string> {
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'retire_rule',
    args: [ruleNumber],
    account: senderAddress,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/** Forgive points for a member — owner only */
export async function writeForgivePoints(
  senderAddress: `0x${string}`,
  member: string,
  points: number
): Promise<string> {
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'forgive_points',
    args: [member, points],
    account: senderAddress,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/** File a new case against an accused */
export async function writeFileCase(
  senderAddress: `0x${string}`,
  accused: string,
  ruleNumber: number,
  complaintUrl: string
): Promise<string> {
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'file_case',
    args: [accused, ruleNumber, complaintUrl],
    account: senderAddress,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

// ---- Case contract (read) methods ----

/** Fetch full case status from a ConcordatCase contract */
export async function readCaseStatus(caseAddress: `0x${string}`): Promise<CaseStatus> {
  const result = await client.readContract({
    address: caseAddress,
    functionName: 'get_status',
    args: [],
  });
  return result as CaseStatus;
}

/** Check if a ruling can be requested for a case */
export async function readCanRequestRuling(caseAddress: `0x${string}`): Promise<boolean> {
  const result = await client.readContract({
    address: caseAddress,
    functionName: 'can_request_ruling',
    args: [],
  });
  return result as boolean;
}

// ---- Case contract (write) methods ----

/** Submit a defense URL — accused only */
export async function writeCaseSubmitDefense(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`,
  url: string
): Promise<string> {
  const txHash = await client.writeContract({
    address: caseAddress,
    functionName: 'submit_defense',
    args: [url],
    account: senderAddress,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/** Request an AI ruling on a case */
export async function writeCaseRequestRuling(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`
): Promise<string> {
  const txHash = await client.writeContract({
    address: caseAddress,
    functionName: 'request_ruling',
    args: [],
    account: senderAddress,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/** Appeal a ruling — losing party only */
export async function writeCaseAppeal(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`,
  groundsUrl: string
): Promise<string> {
  const txHash = await client.writeContract({
    address: caseAddress,
    functionName: 'appeal',
    args: [groundsUrl],
    account: senderAddress,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/** Finalize a case after the appeal window passes */
export async function writeCaseFinalize(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`
): Promise<string> {
  const txHash = await client.writeContract({
    address: caseAddress,
    functionName: 'finalize',
    args: [],
    account: senderAddress,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/** Abandon a stuck appeal */
export async function writeCaseAbandonAppeal(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`
): Promise<string> {
  const txHash = await client.writeContract({
    address: caseAddress,
    functionName: 'abandon_appeal',
    args: [],
    account: senderAddress,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/** Helper: format seconds into human-readable string */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

/** Helper: truncate an Ethereum address */
export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Helper: map generic errors to user-friendly messages */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('user rejected') || msg.includes('user denied')) {
      return 'Transaction rejected by user.';
    }
    if (msg.includes('wrong network') || msg.includes('chain')) {
      return 'Please switch to GenLayer Studionet.';
    }
    if (msg.includes('insufficient funds')) {
      return 'Insufficient funds for this transaction.';
    }
    return error.message;
  }
  return 'An unexpected error occurred.';
}
