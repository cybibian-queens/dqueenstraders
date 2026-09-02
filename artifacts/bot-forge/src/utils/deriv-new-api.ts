export const DERIV_NEW_API_BASE_URL = 'https://api.derivws.com';

const runtime = window as Window & {
    __DERIV_NEW_APP_ID__?: string;
};

// The New API App ID is distinct from the OAuth client ID.
export const DERIV_NEW_APP_ID =
    runtime.__DERIV_NEW_APP_ID__ ||
    (import.meta.env.VITE_DERIV_NEW_APP_ID as string | undefined) ||
    '';

const ACTIVE_ACCOUNT_KEY = 'deriv.new_api.active_account';
const SESSION_KEY = 'deriv.new_api.session';
let sessionToken: string | null = null;
let sessionTokenExpiry = 0;

export interface DerivNewToken {
    access_token: string;
    expires_in?: number;
    token_type?: string;
}

export interface DerivOptionsAccount {
    account_id: string;
    balance?: number;
    currency: string;
    group?: string;
    status?: string;
    account_type: 'demo' | 'real' | string;
}

interface AccountsResponse { data?: DerivOptionsAccount[]; errors?: Array<{ message?: string }> }
interface OtpResponse { data?: { url?: string }; errors?: Array<{ message?: string }> }

const restoreSession = (): void => {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as { access_token?: string; expires_at?: number };
        if (!saved.access_token) return;
        if (saved.expires_at && Date.now() >= saved.expires_at) {
            sessionStorage.removeItem(SESSION_KEY);
            return;
        }
        sessionToken = saved.access_token;
        sessionTokenExpiry = saved.expires_at || 0;
    } catch {
        sessionStorage.removeItem(SESSION_KEY);
    }
};

restoreSession();

export const saveDerivNewToken = (token: DerivNewToken): void => {
    sessionToken = token.access_token;
    sessionTokenExpiry = token.expires_in ? Date.now() + token.expires_in * 1000 : 0;
    try {
        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ access_token: sessionToken, expires_at: sessionTokenExpiry || undefined })
        );
    } catch {
        // Keep the in-memory token if sessionStorage is unavailable.
    }
};

export const getDerivNewToken = (): string | null => {
    if (!sessionToken) restoreSession();
    if (!sessionToken) return null;
    if (sessionTokenExpiry && Date.now() >= sessionTokenExpiry) {
        clearDerivNewSession();
        return null;
    }
    return sessionToken;
};

export const clearDerivNewSession = (): void => {
    sessionToken = null;
    sessionTokenExpiry = 0;
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ACTIVE_ACCOUNT_KEY);
};

const getHeaders = (): HeadersInit => {
    const token = getDerivNewToken();
    if (!token) throw new Error('Deriv New API session is not authenticated.');
    if (!DERIV_NEW_APP_ID) throw new Error('Missing VITE_DERIV_NEW_APP_ID.');
    return {
        Authorization: `Bearer ${token}`,
        'Deriv-App-ID': DERIV_NEW_APP_ID,
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };
};

const parseResponse = async <T>(response: Response): Promise<T> => {
    const body = (await response.json().catch(() => ({}))) as T & { errors?: Array<{ message?: string }> };
    if (!response.ok) throw new Error(body.errors?.[0]?.message || `Deriv API request failed (${response.status}).`);
    return body;
};

export const getOptionsAccounts = async (): Promise<DerivOptionsAccount[]> => {
    const response = await fetch(`${DERIV_NEW_API_BASE_URL}/trading/v1/options/accounts`, { headers: getHeaders() });
    const body = await parseResponse<AccountsResponse>(response);
    return body.data || [];
};

export const getOptionsWebSocketUrl = async (accountId: string): Promise<string> => {
    if (!accountId) throw new Error('A Deriv Options account ID is required.');
    const response = await fetch(`${DERIV_NEW_API_BASE_URL}/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`, {
        method: 'POST',
        headers: getHeaders(),
    });
    const body = await parseResponse<OtpResponse>(response);
    const url = body.data?.url;
    if (!url || !url.startsWith('wss://api.derivws.com/trading/v1/options/ws/')) {
        throw new Error('Deriv did not return a valid authenticated WebSocket URL.');
    }
    return url;
};

export const setActiveOptionsAccount = (account: DerivOptionsAccount): void => {
    sessionStorage.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify(account));
};

export const getActiveOptionsAccount = (): DerivOptionsAccount | null => {
    try {
        const value = sessionStorage.getItem(ACTIVE_ACCOUNT_KEY);
        return value ? JSON.parse(value) as DerivOptionsAccount : null;
    } catch {
        return null;
    }
};

export const initializeDerivNewSession = async (): Promise<{ accounts: DerivOptionsAccount[] }> => {
    const accounts = await getOptionsAccounts();
    const active = getActiveOptionsAccount();
    if (!active || !accounts.some(account => account.account_id === active.account_id)) {
        const demo = accounts.find(account => account.account_type === 'demo' && account.status === 'active');
        const fallback = demo || accounts.find(account => account.status === 'active') || accounts[0];
        if (fallback) setActiveOptionsAccount(fallback);
    }
    return { accounts };
};