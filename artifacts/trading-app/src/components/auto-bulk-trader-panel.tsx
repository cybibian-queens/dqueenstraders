import { useMemo, useState } from 'react';
import type { BulkTraderRisk } from '@/lib/auto-bulk-trader/types';

export interface AutoBulkTraderPanelProps {
  risk: BulkTraderRisk;
  onRiskChange?: (risk: BulkTraderRisk) => void;
  onStart?: () => void;
  onStop?: () => void;
  running?: boolean;
  selectedMarket?: string;
  tradeType?: string;
  score?: number;
  occurrenceTrades?: number;
  sessionPnl?: number;
}

export default function AutoBulkTraderPanel({
  risk,
  onRiskChange,
  onStart,
  onStop,
  running = false,
  selectedMarket = 'Scanning all markets',
  tradeType = '—',
  score = 0,
  occurrenceTrades = 0,
  sessionPnl = 0,
}: AutoBulkTraderPanelProps) {
  const [auto, setAuto] = useState(running);
  const update = (patch: Partial<BulkTraderRisk>) => onRiskChange?.({ ...risk, ...patch });
  const pnlLabel = useMemo(() => `${sessionPnl >= 0 ? '+' : ''}${sessionPnl.toFixed(2)}`, [sessionPnl]);

  const toggle = () => {
    const next = !auto;
    setAuto(next);
    if (next) onStart?.();
    else onStop?.();
  };

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm" aria-label="Auto Bulk Trader">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Auto Bulk Trader</h2>
          <p className="text-sm text-muted-foreground">Scan all volatility markets and trade new occurrences only.</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg border px-4 py-2 text-sm font-semibold"
          aria-pressed={auto}
        >
          {auto ? 'AUTO ON' : 'AUTO OFF'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm">Stake<input type="number" min="0.01" step="0.01" value={risk.stake} onChange={e => update({ stake: Number(e.target.value) })} className="rounded-lg border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Trades / occurrence<input type="number" min="1" step="1" value={risk.tradesPerOccurrence} onChange={e => update({ tradesPerOccurrence: Math.max(1, Number(e.target.value)) })} className="rounded-lg border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Take Profit<input type="number" min="0" step="0.01" value={risk.takeProfit ?? ''} onChange={e => update({ takeProfit: e.target.value === '' ? null : Number(e.target.value) })} className="rounded-lg border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Stop Loss<input type="number" min="0" step="0.01" value={risk.stopLoss ?? ''} onChange={e => update({ stopLoss: e.target.value === '' ? null : Number(e.target.value) })} className="rounded-lg border bg-background px-3 py-2" /></label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
        <div><span className="text-muted-foreground">Market</span><div className="font-medium">{selectedMarket}</div></div>
        <div><span className="text-muted-foreground">Trade type</span><div className="font-medium">{tradeType}</div></div>
        <div><span className="text-muted-foreground">Score</span><div className="font-medium">{score}/100</div></div>
        <div><span className="text-muted-foreground">Occurrence</span><div className="font-medium">{occurrenceTrades}/{risk.tradesPerOccurrence}</div></div>
        <div><span className="text-muted-foreground">Session P/L</span><div className="font-medium">{pnlLabel}</div></div>
      </div>

      <button
        type="button"
        onClick={onStop}
        className="mt-5 w-full rounded-xl border px-4 py-3 font-bold"
      >
        🛑 EMERGENCY STOP
      </button>
    </section>
  );
}
