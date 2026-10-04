// ============================================================
// GenLayer client setup for Concordat dApp
// Uses genlayer-js with studionet chain
// ============================================================

import { createClient } from 'genlayer-js';
import { getEthereumProvider } from './wallet';
import type { TransactionHash } from 'genlayer-js/types';
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
  import.meta.env.VITE_CONTRACT_ADDRESS || '0x5E3B347016A53FF1a79A7B16e9Bde1CB840fae3E'
) as `0x${string}`;

/** Project links */
export const GITHUB_URL = 'https://github.com/reza9133/concordat';
export const EXPLORER_URL = `https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`;

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
  // The wallet provider is passed explicitly so signing always goes through
  // the wallet the user connected, not whichever extension injected first.
  return createClient({
    chain: studionet,
    account: senderAddress,
    provider: getEthereumProvider() ?? undefined,
  } as Parameters<typeof createClient>[0]);
}

type WriteClient = ReturnType<typeof writeClient>;
type WriteParams = Parameters<WriteClient['writeContract']>[0];

/**
 * Fee-charging networks (Consensus v0.6, genlayer-js v2) require a fee
 * distribution and deposit on every write. Older SDKs and gasless Studio
 * deployments do not expose the estimator; there the write is sent as before.
 */
async function sendWrite(client: WriteClient, params: WriteParams): Promise<string> {
  const estimator = (client as unknown as {
    estimateTransactionFeesForWrite?: (
      args: unknown,
    ) => Promise<{ distribution: unknown; feeValue: bigint }>;
  }).estimateTransactionFeesForWrite;

  let fees: { distribution: unknown; feeValue: bigint } | undefined;
  if (typeof estimator === 'function') {
    try {
      const estimate = await estimator.call(client, params);
      fees = { distribution: estimate.distribution, feeValue: estimate.feeValue };
    } catch {
      fees = undefined; // gasless network: nothing to attach
    }
  }
  return client.writeContract((fees ? { ...params, fees } : params) as WriteParams);
}

// ---------------------------------------------------------------------------
// Transaction result check
// ---------------------------------------------------------------------------

/** Poll for up to ~5 minutes: an LLM ruling needs consensus and can be slow. */
const WAIT_INTERVAL_MS = 3000;
const WAIT_RETRIES = 100;

/** Statuses where the network gave up without producing a result. */
const NO_RESULT_STATUSES = ['UNDETERMINED', 'CANCELED', 'LEADER_TIMEOUT', 'VALIDATORS_TIMEOUT'];

type Loose = Record<string, unknown>;

function lastLine(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1].slice(0, 300) : '';
}

/**
 * Inspect a decided transaction. ACCEPTED only means validators agreed on
 * the receipt; the receipt itself can be a contract error ("window has
 * closed", "only the owner", ...). Returns a message, or null on success.
 *
 * Studio receipts carry the result in consensus_data.leader_receipt[].
 * execution_result, other backends in txExecutionResultName, so both are
 * checked.
 */
export function describeFailure(tx: unknown): string | null {
  const t = tx as Loose;
  const status = String(t.statusName ?? t.status ?? '').toUpperCase();
  if (NO_RESULT_STATUSES.includes(status)) {
    return `The network did not reach a result (${status.toLowerCase().replace('_', ' ')}).`;
  }
  const consensus = (t.consensus_data ?? null) as Loose | null;
  const raw = consensus?.leader_receipt;
  const receipts = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Loose[];
  const failed =
    t.txExecutionResultName === 'FINISHED_WITH_ERROR' ||
    receipts.some((r) => String(r.execution_result ?? '').toUpperCase().includes('ERROR'));
  if (!failed) return null;
  for (const r of receipts) {
    const genvm = (r.genvm_result ?? null) as Loose | null;
    const detail =
      lastLine(String(genvm?.stderr ?? '')) || lastLine(String(genvm?.stdout ?? ''));
    if (detail) return `The contract rejected the action: ${detail}`;
  }
  return 'The contract rejected the action.';
}

/**
 * Wait for a write to be decided and verify it actually succeeded.
 * If we stop waiting, say so instead of reporting a failure: the
 * transaction may still go through, and a retry would repeat it.
 */
async function waitAndCheck(
  client: ReturnType<typeof createClient>,
  txHash: string,
): Promise<string> {
  let receipt: unknown;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: txHash as TransactionHash,
      interval: WAIT_INTERVAL_MS,
      retries: WAIT_RETRIES,
    });
  } catch (err) {
    if (err instanceof Error && /timed out/i.test(err.message)) {
      throw new Error(
        'The transaction was submitted but is still being processed. ' +
          'Refresh in a minute before trying again so the action is not repeated.',
      );
    }
    throw err;
  }
  const failure = describeFailure(receipt);
  if (failure) throw new Error(failure);
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
  const txHash = await sendWrite(wc, {
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
  const txHash = await sendWrite(wc, {
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
  const txHash = await sendWrite(wc, {
    address: CONTRACT_ADDRESS,
    functionName: 'forgive_points',
    args: [member, points],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/** Forgive dismissed complaints (lifts the filing lockout) — owner only */
export async function writeForgiveDismissals(
  senderAddress: `0x${string}`,
  member: string,
  count: number,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await sendWrite(wc, {
    address: CONTRACT_ADDRESS,
    functionName: 'forgive_dismissals',
    args: [member, count],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/**
 * File a new case against an accused. Returns the transaction hash and, when
 * it can be found, the address of the case contract the hall deployed.
 */
export async function writeFileCase(
  senderAddress: `0x${string}`,
  accused: string,
  ruleNumber: number,
  complaintUrl: string,
): Promise<{ txHash: string; caseAddress: string | null }> {
  const wc = writeClient(senderAddress);
  const txHash = await sendWrite(wc, {
    address: CONTRACT_ADDRESS,
    functionName: 'file_case',
    args: [accused, ruleNumber, complaintUrl],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  await waitAndCheck(wc, txHash);
  return { txHash, caseAddress: await findFiledCase(senderAddress, complaintUrl) };
}

/** Look through the newest cases for the one this member just filed. */
async function findFiledCase(complainant: string, complaintUrl: string): Promise<string | null> {
  try {
    const total = Number(await readGetCaseCount());
    const start = Math.max(0, total - 10);
    const recent = await readGetCases(start, total - start);
    for (const address of [...recent].reverse()) {
      const status = await readCaseStatus(address as `0x${string}`);
      if (
        status.complainant.toLowerCase() === complainant.toLowerCase() &&
        status.complaint_url === complaintUrl
      ) {
        return address;
      }
    }
  } catch {
    /* the case was filed; only the shortcut to its page is lost */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Case contract (read) methods
// ---------------------------------------------------------------------------

/** Fetch full case status — maps raw output to CaseStatus */
export async function readCaseStatus(caseAddress: `0x${string}`): Promise<CaseStatus> {
  const result = (await readClient.readContract({
    address: caseAddress,
    functionName: 'get_status',
    args: [],
  })) as unknown as RawCaseStatus;

  // The appeal grounds URL is stored on the appeal contract, not the case.
  let appeal: { grounds_url?: unknown; status?: unknown } | null = null;
  const appealAddress = /^0x0{40}$/i.test(result.appeal_contract ?? '')
    ? ''
    : result.appeal_contract;
  if (appealAddress) {
    try {
      appeal = (await readClient.readContract({
        address: appealAddress as `0x${string}`,
        functionName: 'get_status',
        args: [],
      })) as unknown as { grounds_url?: unknown; status?: unknown };
    } catch {
      appeal = null; // the case page still works without the grounds link
    }
  }
  return mapCaseStatus(result, appeal);
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
  const txHash = await sendWrite(wc, {
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
  const txHash = await sendWrite(wc, {
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
  const txHash = await sendWrite(wc, {
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
  const txHash = await sendWrite(wc, {
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
  const txHash = await sendWrite(wc, {
    address: caseAddress,
    functionName: 'abandon_appeal',
    args: [],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/**
 * Withdraw a case that has not been ruled on — complainant only, and only
 * while the defense window is open and the accused has not answered.
 * No verdict is recorded.
 */
export async function writeCaseWithdraw(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await sendWrite(wc, {
    address: caseAddress,
    functionName: 'withdraw',
    args: [],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/** Close a case that is still unruled after both windows — complainant only */
export async function writeCaseExpire(
  senderAddress: `0x${string}`,
  caseAddress: `0x${string}`,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await sendWrite(wc, {
    address: caseAddress,
    functionName: 'expire',
    args: [],
    value: 0n,
  } as Parameters<typeof wc.writeContract>[0]);
  return waitAndCheck(wc, txHash);
}

/**
 * Run the appeal review — anyone can call, once. This targets the
 * ConcordatAppeal contract (the case's `appeal_contract`), not the case.
 */
export async function writeAppealReview(
  senderAddress: `0x${string}`,
  appealAddress: `0x${string}`,
): Promise<string> {
  const wc = writeClient(senderAddress);
  const txHash = await sendWrite(wc, {
    address: appealAddress,
    functionName: 'review',
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
