import type { BulkTraderRisk, BulkTraderSession, Opportunity, OccurrenceState } from './types';
import { evaluateRisk } from './risk-manager';

export interface ExecutionPlan {
  occurrence: Opportunity;
  tradesPerOccurrence: number;
}

export interface ExecutionState {
  session: BulkTraderSession;
  occurrence: OccurrenceState | null;
}

export type ExecutionAction =
  | { type: 'EXECUTE_TRADE'; occurrenceId: string; tradeNumber: number; symbol: string; tradeType: string; stake: number }
  | { type: 'RESCAN' }
  | { type: 'STOP'; reason: NonNullable<BulkTraderSession['stopReason']> };

export function createExecutionState(startedBalance: number, mode: BulkTraderSession['mode'] = 'auto'): ExecutionState {
  return {
    session: {
      mode,
      status: 'idle',
      startedBalance,
      currentBalance: startedBalance,
      realizedPnl: 0,
      tradesExecuted: 0,
      consecutiveLosses: 0,
      currentOccurrenceId: null,
      stopReason: null,
    },
    occurrence: null,
  };
}

export function planNextAction(state: ExecutionState, plan: ExecutionPlan, risk: BulkTraderRisk): ExecutionAction {
  const stopReason = evaluateRisk(state.session, risk);
  if (stopReason) return { type: 'STOP', reason: stopReason };

  const occurrenceTrades = state.occurrence?.occurrenceId === plan.occurrence.occurrenceId
    ? state.occurrence.tradesExecuted
    : 0;

  if (occurrenceTrades >= Math.max(1, Math.floor(plan.tradesPerOccurrence))) {
    return { type: 'RESCAN' };
  }

  return {
    type: 'EXECUTE_TRADE',
    occurrenceId: plan.occurrence.occurrenceId,
    tradeNumber: occurrenceTrades + 1,
    symbol: plan.occurrence.symbol,
    tradeType: plan.occurrence.tradeType,
    stake: risk.stake,
  };
}

export function recordTrade(state: ExecutionState, occurrence: Opportunity, won: boolean, profitLoss: number): ExecutionState {
  const existing = state.occurrence?.occurrenceId === occurrence.occurrenceId
    ? state.occurrence
    : {
        id: occurrence.occurrenceId,
        symbol: occurrence.symbol,
        signature: occurrence.occurrenceId,
        tradesExecuted: 0,
        completed: false,
        detectedAt: occurrence.detectedAt,
      };

  const tradesExecuted = existing.tradesExecuted + 1;
  return {
    occurrence: { ...existing, tradesExecuted },
    session: {
      ...state.session,
      status: 'monitoring',
      currentOccurrenceId: occurrence.occurrenceId,
      currentBalance: state.session.currentBalance + profitLoss,
      realizedPnl: state.session.realizedPnl + profitLoss,
      tradesExecuted: state.session.tradesExecuted + 1,
      consecutiveLosses: won ? 0 : state.session.consecutiveLosses + 1,
    },
  };
}
