import type { DerivWS } from '../../../../lib/deriv-core/src/ws';
import type { ProposalInfo, ProposalParams, ProposalResponse, BuyResponse, BuyResult } from '../../../../lib/deriv-core/src/types';

export interface ExecuteContractInput extends ProposalParams {
  stake: number;
}

export interface ExecuteContractResult extends BuyResult {
  proposal: ProposalInfo;
}

/**
 * Creates a fresh proposal and buys exactly one contract.
 * The caller is responsible for occurrence/risk gating before invoking this adapter.
 */
export async function executeOneContract(
  ws: DerivWS,
  input: ExecuteContractInput,
): Promise<ExecuteContractResult> {
  if (input.stake <= 0) throw new Error('Stake must be greater than zero');

  const payload: Record<string, unknown> = {
    proposal: 1,
    amount: input.stake,
    basis: input.basis,
    contract_type: input.contractType,
    currency: input.currency,
    underlying_symbol: input.symbol,
  };

  if (input.dateExpiry !== undefined) {
    payload.date_expiry = input.dateExpiry;
  } else {
    payload.duration = input.duration;
    payload.duration_unit = input.durationUnit;
  }
  if (input.barrier !== undefined) payload.barrier = input.barrier;

  const proposalResponse = await ws.send<ProposalResponse>(payload);
  if (!proposalResponse.proposal) throw new Error('No valid proposal returned');

  const p = proposalResponse.proposal;
  const proposal: ProposalInfo = {
    id: p.id,
    askPrice: p.ask_price,
    payout: p.payout,
    longcode: p.longcode,
    minStake: Number.parseFloat(p.validation_params?.stake?.min ?? '0'),
    maxPayout: Number.parseFloat(p.validation_params?.payout?.max ?? '0'),
  };

  if (!proposal.id || !Number.isFinite(proposal.askPrice)) {
    throw new Error('Invalid proposal received from Deriv');
  }

  const buyResponse = await ws.send<BuyResponse>({
    buy: proposal.id,
    price: String(proposal.askPrice),
  });

  if (!buyResponse.buy) throw new Error('Contract purchase failed');

  return {
    contractId: buyResponse.buy.contract_id,
    buyPrice: buyResponse.buy.buy_price,
    payout: buyResponse.buy.payout,
    longcode: buyResponse.buy.longcode,
    balanceAfter: buyResponse.buy.balance_after,
    proposal,
  };
}
