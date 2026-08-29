import { OptionsWebSocket, type NewApiWsMessage } from './options-ws';

export interface NewApiSessionConfig {
  apiBaseUrl: string;
  appId: string;
  accessToken: string;
  accountId: string;
}

export interface NewApiSession {
  accountId: string;
  wsUrl: string;
  ws: OptionsWebSocket;
}

export interface NewApiProposalParams {
  amount: number;
  basis: 'stake' | 'payout';
  contract_type: string;
  currency: string;
  underlying_symbol: string;
  duration?: number;
  duration_unit?: 's' | 'm' | 'h' | 'd' | 't';
  date_expiry?: number;
  barrier?: string;
  barrier2?: string;
  multiplier?: number;
  cancellation?: string;
  limit_order?: { take_profit?: number; stop_loss?: number };
}

async function getOtpUrl(config: NewApiSessionConfig): Promise<string> {
  const response = await fetch(
    `${config.apiBaseUrl}/trading/v1/options/accounts/${encodeURIComponent(config.accountId)}/otp`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Deriv-App-ID': config.appId,
      },
    },
  );

  const payload = (await response.json()) as { data?: { url?: string }; errors?: Array<{ message?: string }> };
  if (!response.ok || !payload.data?.url) {
    throw new Error(payload.errors?.[0]?.message ?? `Unable to obtain New API WebSocket URL (${response.status})`);
  }
  if (!payload.data.url.startsWith('wss://api.derivws.com/trading/v1/options/ws/')) {
    throw new Error('Deriv returned an unexpected WebSocket URL');
  }
  return payload.data.url;
}

export async function createNewApiTradingSession(config: NewApiSessionConfig): Promise<NewApiSession> {
  if (!config.accessToken) throw new Error('New API access token is required');
  if (!config.appId) throw new Error('New API App ID is required');
  if (!config.accountId) throw new Error('Options account ID is required');

  const wsUrl = await getOtpUrl(config);
  const ws = new OptionsWebSocket(wsUrl);
  await ws.connect();
  return { accountId: config.accountId, wsUrl, ws };
}

export async function getActiveSymbols(session: NewApiSession): Promise<NewApiWsMessage> {
  return session.ws.request({ active_symbols: 'brief' });
}

export async function getAccountBalance(session: NewApiSession): Promise<NewApiWsMessage> {
  return session.ws.request({ balance: 1, subscribe: 1 });
}

export async function subscribeToTicks(
  session: NewApiSession,
  symbol: string,
  handler: (message: NewApiWsMessage) => void,
) {
  return session.ws.subscribe({ ticks: symbol }, handler);
}

export async function requestProposal(
  session: NewApiSession,
  params: NewApiProposalParams,
  handler?: (message: NewApiWsMessage) => void,
) {
  const request = { proposal: 1, ...params };
  return handler
    ? session.ws.subscribe(request, handler)
    : session.ws.request(request);
}

export async function buyProposal(
  session: NewApiSession,
  proposalId: string,
  price: number,
): Promise<NewApiWsMessage> {
  if (!proposalId) throw new Error('A proposal ID is required to buy.');
  if (!Number.isFinite(price) || price < 0) throw new Error('A valid maximum buy price is required.');
  return session.ws.request({ buy: proposalId, price });
}

export async function getOpenContract(
  session: NewApiSession,
  contractId: string,
  handler?: (message: NewApiWsMessage) => void,
) {
  const request = { proposal_open_contract: 1, contract_id: Number(contractId), subscribe: 1 };
  return handler
    ? session.ws.subscribe(request, handler)
    : session.ws.request(request);
}

export async function sellContract(session: NewApiSession, contractId: string, price = 0) {
  return session.ws.request({ sell: Number(contractId), price });
}
