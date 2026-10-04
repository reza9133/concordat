// ============================================================
// mappers.ts — translate raw contract output to UI types
//
// The contracts return Python-style flat field names. These
// functions normalise them into the richer typed shapes the UI
// components consume. All field-name mismatches are resolved here
// so the rest of the codebase never has to know about them.
// ============================================================

import type {
  RawStanding,
  RawCaseStatus,
  Standing,
  CaseStatus,
  CaseRuling,
} from '../types';

// ---------------------------------------------------------------------------
// Standing
// ---------------------------------------------------------------------------

/**
 * Map the raw `get_standing` result to the normalised Standing type.
 *
 * Contract label values:
 *   "good_standing" → "good"
 *   "probation"     → "probation"
 *   "suspended"     → "suspended"
 */
export function mapStanding(raw: RawStanding): Standing {
  let status: Standing['status'] = 'good';
  const label = String(raw.label ?? '').toLowerCase();
  if (label === 'probation') status = 'probation';
  else if (label === 'suspended') status = 'suspended';
  // "good_standing" or any unknown value → "good"

  return {
    points: Number(raw.points ?? 0),
    status,
    dismissed_complaints: Number(raw.dismissed_filed ?? 0),
    withdrawn_cases: Number(raw.withdrawn_filed ?? 0),
    open_cases: Number(raw.open_filed ?? 0),
    // Older halls do not report can_file: treat as allowed and let the contract decide.
    can_file: raw.can_file === undefined ? true : Boolean(raw.can_file),
  };
}

// ---------------------------------------------------------------------------
// CaseRuling helpers
// ---------------------------------------------------------------------------

/**
 * Build a CaseRuling from the flat first-instance fields.
 * Returns null when the case has not been ruled yet (first_severity=0,
 * first_summary="" is ambiguous if violation=false, so we gate on ruled_at).
 *
 * The status alone is not enough: a case that was withdrawn or expired
 * unruled goes straight from "open" to "final" and never had a ruling.
 * ruled_at is 0 until a ruling exists.
 */
function buildFirstRuling(raw: RawCaseStatus): CaseRuling | null {
  if (raw.status === 'open' || !(Number(raw.ruled_at ?? 0) > 0)) return null;

  return {
    violation: Boolean(raw.first_violation),
    severity: Number(raw.first_severity ?? 0),
    summary: String(raw.first_summary ?? ''),
    reasoning: String(raw.first_reasoning ?? ''),
  };
}

/**
 * Build a CaseRuling from the flat final fields.
 * Returns null when the case is not yet final.
 */
function buildFinalRuling(raw: RawCaseStatus): CaseRuling | null {
  if (raw.status !== 'final') return null;

  return {
    violation: Boolean(raw.final_violation),
    severity: Number(raw.final_severity ?? 0),
    summary: String(raw.final_summary ?? ''),
    reasoning: String(raw.final_reasoning ?? ''),
  };
}

// ---------------------------------------------------------------------------
// CaseStatus
// ---------------------------------------------------------------------------

const ZERO_ADDRESS = /^0x0{40}$/i;

/** The contract reports "no address" as the zero address, not "". */
function addressOrNull(value: unknown): string | null {
  const s = typeof value === 'string' ? value : '';
  return s && !ZERO_ADDRESS.test(s) ? s : null;
}

/** 0 means "not set yet" in the contract's timestamps. */
function timeOrNull(value: unknown): number | null {
  const n = Number(value ?? 0);
  return n > 0 ? n : null;
}

/**
 * Map the raw `get_status` result to the normalised CaseStatus type.
 *
 * The deadlines come straight from the contract (`defense_closes_at`,
 * `appeal_closes_at`, `review_closes_at`), so the UI button conditions
 * match what the contract enforces on-chain. get_status does not return
 * the window lengths, so they must never be recomputed here.
 *
 * `appeal` is the appeal contract's get_status() (or null): the grounds
 * URL is stored there, not on the case.
 */
export function mapCaseStatus(
  raw: RawCaseStatus,
  appeal: { grounds_url?: unknown; status?: unknown } | null = null,
): CaseStatus {
  const groundsUrl = appeal && typeof appeal.grounds_url === 'string' ? appeal.grounds_url : '';

  return {
    hall_address: String(raw.hall ?? ''),
    complainant: String(raw.complainant ?? ''),
    accused: String(raw.accused ?? ''),
    rule_number: Number(raw.rule_number ?? 0),
    rule_title: String(raw.rule_title ?? ''),
    complaint_url: String(raw.complaint_url ?? ''),
    defense_url: raw.defense_url ? String(raw.defense_url) : null,
    appeal_grounds_url: groundsUrl || null,
    // The review already has a result and only waits for the network to finalize it.
    appeal_decided: !!appeal && String(appeal.status ?? '') === 'decided',
    status: raw.status,
    opened_at: Number(raw.opened_at ?? 0),
    defense_closes_at: Number(raw.defense_closes_at ?? 0),
    appeal_closes_at: timeOrNull(raw.appeal_closes_at),
    ruled_at: timeOrNull(raw.ruled_at),
    appeal_contract: addressOrNull(raw.appeal_contract),
    appellant: addressOrNull(raw.appellant),
    appealed_at: timeOrNull(raw.appealed_at),
    review_closes_at: timeOrNull(raw.review_closes_at),
    first_ruling: buildFirstRuling(raw),
    final_ruling: buildFinalRuling(raw),
    decided_by: String(raw.decided_by ?? ''),
  };
}
