import type { MarketSnapshot, Opportunity, OccurrenceState } from './types';

export interface OccurrenceConfig {
  minScore: number;
  lookback: number;
  minMove: number;
}

const defaultConfig: OccurrenceConfig = {
  minScore: 65,
  lookback: 8,
  minMove: 0,
};

function signature(snapshot: MarketSnapshot, tradeType: string, config: OccurrenceConfig): string {
  const ticks = snapshot.ticks.slice(-config.lookback);
  const direction = ticks.length > 1 && ticks[ticks.length - 1] >= ticks[0] ? 'UP' : 'DOWN';
  const magnitude = ticks.length > 1 ? Math.abs(ticks[ticks.length - 1] - ticks[0]) : 0;
  return `${snapshot.symbol}:${tradeType}:${direction}:${magnitude}`;
}

export function detectOccurrence(
  snapshot: MarketSnapshot,
  tradeType: string,
  score: number,
  reason: string,
  previous: OccurrenceState | null,
  config: Partial<OccurrenceConfig> = {},
): Opportunity | null {
  const merged = { ...defaultConfig, ...config };
  if (score < merged.minScore || snapshot.ticks.length < 2) return null;

  const ticks = snapshot.ticks.slice(-merged.lookback);
  const move = Math.abs(ticks[ticks.length - 1] - ticks[0]);
  if (move < merged.minMove) return null;

  const currentSignature = signature(snapshot, tradeType, merged);
  if (previous?.symbol === snapshot.symbol && previous.signature === currentSignature && !previous.completed) {
    return null;
  }

  return {
    symbol: snapshot.symbol,
    displayName: snapshot.displayName,
    tradeType,
    score,
    occurrenceId: `${snapshot.symbol}-${Date.now()}-${currentSignature}`,
    reason,
    detectedAt: Date.now(),
  };
}

export function completeOccurrence(previous: OccurrenceState, tradesExecuted: number): OccurrenceState {
  return { ...previous, tradesExecuted, completed: true };
}
