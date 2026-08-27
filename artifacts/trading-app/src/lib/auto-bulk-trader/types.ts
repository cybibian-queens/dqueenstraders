export type BulkTraderMode = 'manual' | 'auto';
export type TraderStatus = 'idle' | 'scanning' | 'ready' | 'executing' | 'monitoring' | 'stopped';
export type StopReason = 'take_profit' | 'stop_loss' | 'max_trades' | 'consecutive_losses' | 'emergency' | 'disconnect' | 'auth_lost' | 'error' | null;

export interface MarketSnapshot {
  symbol: string;
  displayName: string;
  ticks: number[];
  timestamp: number;
}

export interface Opportunity {
  symbol: string;
  displayName: string;
  tradeType: string;
  score: number;
  occurrenceId: string;
  reason: string;
  detectedAt: number;
}

export interface BulkTraderRisk {
  stake: number;
  tradesPerOccurrence: number;
  takeProfit: number | null;
  stopLoss: number | null;
  maxTrades: number | null;
  maxConsecutiveLosses: number | null;
}

export interface BulkTraderSession {
  mode: BulkTraderMode;
  status: TraderStatus;
  startedBalance: number;
  currentBalance: number;
  realizedPnl: number;
  tradesExecuted: number;
  consecutiveLosses: number;
  currentOccurrenceId: string | null;
  stopReason: StopReason;
}

export interface OccurrenceState {
  id: string;
  symbol: string;
  signature: string;
  tradesExecuted: number;
  completed: boolean;
  detectedAt: number;
}
