import { OptionsWebSocket } from './options-ws';

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

export async function createNewApiTradingSession(
  config: NewApiSessionConfig,
): Promise<NewApiSession> {
  if (!config.accessToken) throw new Error('New API access token is required');
  if (!config.appId) throw new Error('New API App ID is required');
  if (!config.accountId) throw new Error('Options account ID is required');

  const wsUrl = await getOtpUrl(config);
  const ws = new OptionsWebSocket(wsUrl);
  await ws.connect();

  return { accountId: config.accountId, wsUrl, ws };
}

export async function getAccountBalance(session: NewApiSession) {
  return session.ws.request({ balance: 1, subscribe: 1 });
}

export async function subscribeToTicks(session: NewApiSession, symbol: string) {
  return session.ws.request({ ticks: symbol, subscribe: 1 });
}

export async function requestProposal(session: NewApiSession, proposal: Record<string, unknown>) {
  return session.ws.request({ proposal: 1, ...proposal });
}

export async function buyProposal(session: NewApiSession, proposalId: string, price: number) {
  return session.ws.request({ buy: proposalId, price });
}

export async function getOpenContract(session: NewApiSession, contractId: string) {
  return session.ws.request({ proposal_open_contract: 1, contract_id: contractId });
}
