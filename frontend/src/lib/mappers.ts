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
  };
}

// ---------------------------------------------------------------------------
// CaseRuling helpers
// ---------------------------------------------------------------------------

/**
 * Build a CaseRuling from the flat first-instance fields.
 * Returns null when the case has not been ruled yet (first_severity=0,
 * first_summary="" is ambiguous if violation=false, so we gate on status).
 */
function buildFirstRuling(raw: RawCaseStatus): CaseRuling | null {
  // Only available after the case has been ruled
  if (raw.status === 'open') return null;

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

/**
 * Map the raw `get_status` result to the normalised CaseStatus type.
 *
 * Computed deadline timestamps:
 *   defense_closes_at = opened_at + defense_window
 *   appeal_closes_at  = ruled_at  + appeal_window  (null until ruled)
 *   review_closes_at  = appealed_at + appeal_window (null until under_appeal)
 *
 * These mirror what the contract checks on-chain, so the UI button
 * conditions stay in sync with contract-level enforcement.
 */
export function mapCaseStatus(raw: RawCaseStatus): CaseStatus {
  const openedAt = Number(raw.opened_at ?? 0);
  const defenseWindow = Number(raw.defense_window ?? 0);
  const appealWindow = Number(raw.appeal_window ?? 0);
  const ruledAt = Number(raw.ruled_at ?? 0);
  const appealedAt = Number(raw.appealed_at ?? 0);

  const defenseClosesAt = openedAt + defenseWindow;

  const appealClosesAt =
    raw.status !== 'open' && ruledAt > 0
      ? ruledAt + appealWindow
      : null;

  const reviewClosesAt =
    raw.status === 'under_appeal' && appealedAt > 0
      ? appealedAt + appealWindow
      : null;

  return {
    hall_address: String(raw.hall ?? ''),
    complainant: String(raw.complainant ?? ''),
    accused: String(raw.accused ?? ''),
    rule_number: Number(raw.rule_number ?? 0),
    rule_title: String(raw.rule_title ?? ''),
    rule_text: String(raw.rule_text ?? ''),
    complaint_url: String(raw.complaint_url ?? ''),
    defense_url: raw.defense_url && raw.defense_url !== '' ? String(raw.defense_url) : null,
    status: raw.status,
    opened_at: openedAt,
    defense_closes_at: defenseClosesAt,
    appeal_closes_at: appealClosesAt,
    ruled_at: ruledAt > 0 ? ruledAt : null,
    appeal_contract: raw.appeal_contract && raw.appeal_contract !== '' ? String(raw.appeal_contract) : null,
    appellant: raw.appellant && raw.appellant !== '' ? String(raw.appellant) : null,
    appealed_at: appealedAt > 0 ? appealedAt : null,
    review_closes_at: reviewClosesAt,
    first_ruling: buildFirstRuling(raw),
    final_ruling: buildFinalRuling(raw),
    decided_by: String(raw.decided_by ?? ''),
  };
}
