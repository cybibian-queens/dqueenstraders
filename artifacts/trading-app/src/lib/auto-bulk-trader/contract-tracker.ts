import type { DerivWS } from '../../../../lib/deriv-core/src/ws';

export interface ContractResult {
  contractId: string;
  status: 'won' | 'lost' | 'open' | 'error';
  profitLoss: number;
  sellPrice?: number;
  isSold?: boolean;
}

type ContractMessage = {
  proposal_open_contract?: {
    contract_id?: string | number;
    is_sold?: number;
    status?: string;
    profit?: number;
    sell_price?: number;
  };
};

/**
 * Subscribes to one open contract until Deriv reports it as sold/closed.
 * The subscription is always cleaned up after a terminal result or error.
 */
export async function waitForContractResult(
  ws: DerivWS,
  contractId: string,
): Promise<ContractResult> {
  if (!contractId) throw new Error('Contract ID is required');

  return new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;

    const finish = (result: ContractResult) => {
      if (settled) return;
      settled = true;
      unsubscribe?.();
      resolve(result);
    };

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      unsubscribe?.();
      reject(error instanceof Error ? error : new Error('Contract tracking failed'));
    };

    ws.subscribe(
      { proposal_open_contract: 1, contract_id: contractId, subscribe: 1 },
      (data) => {
        const message = data as unknown as ContractMessage;
        const contract = message.proposal_open_contract;
        if (!contract) return;

        const id = String(contract.contract_id ?? '');
        if (id !== contractId) return;

        const profitLoss = Number(contract.profit ?? 0);
        const sold = Number(contract.is_sold ?? 0) === 1;
        const status = String(contract.status ?? '').toLowerCase();

        if (!sold && status !== 'won' && status !== 'lost') return;

        finish({
          contractId,
          status: status === 'won' || profitLoss > 0 ? 'won' : 'lost',
          profitLoss,
          sellPrice: Number.isFinite(Number(contract.sell_price)) ? Number(contract.sell_price) : undefined,
          isSold: sold,
        });
      },
    )
      .then((subscription) => {
        if (settled) subscription.unsubscribe();
        else unsubscribe = subscription.unsubscribe;
      })
      .catch(fail);
  });
}
