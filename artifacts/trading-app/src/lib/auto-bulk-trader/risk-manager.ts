import type { BulkTraderRisk, BulkTraderSession, StopReason } from './types';

export function evaluateRisk(session: BulkTraderSession, risk: BulkTraderRisk): StopReason {
  if (risk.takeProfit !== null && session.realizedPnl >= Math.abs(risk.takeProfit)) return 'take_profit';
  if (risk.stopLoss !== null && session.realizedPnl <= -Math.abs(risk.stopLoss)) return 'stop_loss';
  if (risk.maxTrades !== null && session.tradesExecuted >= risk.maxTrades) return 'max_trades';
  if (risk.maxConsecutiveLosses !== null && session.consecutiveLosses >= risk.maxConsecutiveLosses) return 'consecutive_losses';
  return null;
}

export function shouldContinue(session: BulkTraderSession, risk: BulkTraderRisk): boolean {
  return evaluateRisk(session, risk) === null;
}
