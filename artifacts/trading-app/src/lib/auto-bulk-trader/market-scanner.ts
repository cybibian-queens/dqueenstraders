import type { MarketSnapshot, Opportunity } from './types';

export interface ScannerConfig {
  minScore: number;
  lookback: number;
  minSamples: number;
}

export interface ScoredMarket {
  snapshot: MarketSnapshot;
  score: number;
  tradeType: string;
  reason: string;
}

const DEFAULT_CONFIG: ScannerConfig = {
  minScore: 65,
  lookback: 12,
  minSamples: 6,
};

function scoreSnapshot(snapshot: MarketSnapshot, config: ScannerConfig): ScoredMarket | null {
  const ticks = snapshot.ticks.slice(-config.lookback);
  if (ticks.length < config.minSamples) return null;

  const first = ticks[0];
  const last = ticks[ticks.length - 1];
  const move = last - first;
  const absoluteMove = Math.abs(move);
  if (!Number.isFinite(move) || absoluteMove === 0) return null;

  const changes = ticks.slice(1).map((tick, index) => tick - ticks[index]);
  const positive = changes.filter(change => change > 0).length;
  const negative = changes.filter(change => change < 0).length;
  const directionalConsistency = Math.max(positive, negative) / changes.length;

  const magnitudeScore = Math.min(30, absoluteMove > 0 ? 15 + directionalConsistency * 15 : 0);
  const consistencyScore = directionalConsistency * 50;
  const recencyScore = Math.min(20, Math.abs(last - ticks[ticks.length - 2]) > 0 ? 20 : 0);
  const score = Math.round(Math.min(100, consistencyScore + magnitudeScore + recencyScore));

  if (score < config.minScore) return null;

  const tradeType = move > 0 ? 'PUT' : 'CALL';
  return {
    snapshot,
    score,
    tradeType,
    reason: `${tradeType} bias; ${Math.round(directionalConsistency * 100)}% directional consistency over ${ticks.length} ticks`,
  };
}

export function scanMarkets(
  snapshots: MarketSnapshot[],
  config: Partial<ScannerConfig> = {},
): ScoredMarket[] {
  const merged = { ...DEFAULT_CONFIG, ...config };
  return snapshots
    .map(snapshot => scoreSnapshot(snapshot, merged))
    .filter((market): market is ScoredMarket => market !== null)
    .sort((a, b) => b.score - a.score);
}

export function selectBestOpportunity(
  snapshots: MarketSnapshot[],
  config: Partial<ScannerConfig> = {},
): Opportunity | null {
  const best = scanMarkets(snapshots, config)[0];
  if (!best) return null;

  return {
    symbol: best.snapshot.symbol,
    displayName: best.snapshot.displayName,
    tradeType: best.tradeType,
    score: best.score,
    occurrenceId: '',
    reason: best.reason,
    detectedAt: Date.now(),
  };
}
