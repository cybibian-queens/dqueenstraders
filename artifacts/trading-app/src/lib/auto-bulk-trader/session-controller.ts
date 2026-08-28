import type { BulkTraderRisk, BulkTraderSession, Opportunity } from './types';
import { evaluateRisk } from './risk-manager';
import type { ContractResult } from './contract-tracker';
import { recordTrade, type ExecutionState } from './execution-engine';

export type SessionDecision =
  | { type: 'CONTINUE_OCCURRENCE'; occurrence: Opportunity }
  | { type: 'RESCAN' }
  | { type: 'STOP'; reason: NonNullable<BulkTraderSession['stopReason']> };

export function applyContractResult(
  state: ExecutionState,
  occurrence: Opportunity,
  result: ContractResult,
  risk: BulkTraderRisk,
): { state: ExecutionState; decision: SessionDecision } {
  const nextState = recordTrade(
    state,
    occurrence,
    result.status === 'won',
    result.profitLoss,
  );

  const stopReason = evaluateRisk(nextState.session, risk);
  if (stopReason) {
    return {
      state: {
        ...nextState,
        session: {
          ...nextState.session,
          status: 'stopped',
          stopReason,
        },
      },
      decision: { type: 'STOP', reason: stopReason },
    };
  }

  const completed = nextState.occurrence &&
    nextState.occurrence.tradesExecuted >= Math.max(1, Math.floor(risk.tradesPerOccurrence));

  if (completed) {
    return {
      state: nextState,
      decision: { type: 'RESCAN' },
    };
  }

  return {
    state: nextState,
    decision: { type: 'CONTINUE_OCCURRENCE', occurrence },
  };
}

export function stopSession(
  state: ExecutionState,
  reason: NonNullable<BulkTraderSession['stopReason']>,
): ExecutionState {
  return {
    ...state,
    session: {
      ...state.session,
      status: 'stopped',
      stopReason: reason,
    },
  };
}
