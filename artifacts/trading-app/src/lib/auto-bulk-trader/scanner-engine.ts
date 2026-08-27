import type { MarketSnapshot, Opportunity, OccurrenceState } from './types';
import { selectBestOpportunity } from './market-scanner';
import { detectOccurrence } from './occurrence-engine';

export interface ScannerCycleConfig {
  minScore?: number;
  lookback?: number;
  minSamples?: number;
  minMove?: number;
}

export function scanForNewOccurrence(
  snapshots: MarketSnapshot[],
  previous: OccurrenceState | null,
  config: ScannerCycleConfig = {},
): Opportunity | null {
  const candidate = selectBestOpportunity(snapshots, config);
  if (!candidate) return null;

  return detectOccurrence(
    snapshots.find(snapshot => snapshot.symbol === candidate.symbol)!,
    candidate.tradeType,
    candidate.score,
    candidate.reason,
    previous,
    config,
  );
}
