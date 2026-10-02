// ============================================================
// useContract hooks — data fetching from ConcordatHall & Cases
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  readGetConfig,
  readGetRules,
  readGetStanding,
  readGetCasesWithCount,
  readGetCases,
  readCaseStatus,
  readCanRequestRuling,
} from '../lib/genlayer';
import type { HallConfig, Rule, Standing, CaseStatus, CasesResult } from '../types';

const DEFAULT_PAGE_SIZE = 12;

// ---- useHallConfig ----

interface UseHallConfigReturn {
  config: HallConfig | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHallConfig(): UseHallConfigReturn {
  const [config, setConfig] = useState<HallConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await readGetConfig();
      setConfig(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hall config');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { config, isLoading, error, refetch: fetch };
}

// ---- useRules ----

interface UseRulesReturn {
  rules: Rule[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRules(): UseRulesReturn {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await readGetRules();
      setRules(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { rules, isLoading, error, refetch: fetch };
}

// ---- useStanding ----

interface UseStandingReturn {
  standing: Standing | null;
  isLoading: boolean;
  error: string | null;
  lookup: (address: string) => void;
}

export function useStanding(initialAddress?: string): UseStandingReturn {
  const [standing, setStanding] = useState<Standing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (address: string) => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await readGetStanding(address);
      setStanding(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load standing');
      setStanding(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialAddress) lookup(initialAddress);
  }, [initialAddress, lookup]);

  return { standing, isLoading, error, lookup };
}

// ---- useCases ----

interface UseCasesReturn {
  cases: string[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useCases(): UseCasesReturn {
  const [cases, setCases] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result: CasesResult = await readGetCasesWithCount(0, DEFAULT_PAGE_SIZE);
      setCases(result.addresses);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const more = await readGetCases(cases.length, DEFAULT_PAGE_SIZE);
      setCases((prev) => [...prev, ...more]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more cases');
    } finally {
      setIsLoadingMore(false);
    }
  }, [cases.length, isLoadingMore]);

  useEffect(() => { fetch(); }, [fetch]);

  return {
    cases,
    total,
    isLoading,
    isLoadingMore,
    error,
    hasMore: cases.length < total,
    loadMore,
    refetch: fetch,
  };
}

// ---- useCaseStatus ----

interface UseCaseStatusReturn {
  status: CaseStatus | null;
  canRequestRuling: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCaseStatus(caseAddress: string): UseCaseStatusReturn {
  const [status, setStatus] = useState<CaseStatus | null>(null);
  const [canRequestRuling, setCanRequestRuling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!caseAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const addr = caseAddress as `0x${string}`;
      const [caseStatus, canRule] = await Promise.all([
        readCaseStatus(addr),
        readCanRequestRuling(addr),
      ]);
      setStatus(caseStatus);
      setCanRequestRuling(canRule);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load case status');
    } finally {
      setIsLoading(false);
    }
  }, [caseAddress]);

  useEffect(() => { fetch(); }, [fetch]);

  return { status, canRequestRuling, isLoading, error, refetch: fetch };
}
