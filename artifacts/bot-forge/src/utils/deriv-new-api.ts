export const DERIV_NEW_API_BASE_URL = 'https://api.derivws.com';
export const DERIV_NEW_APP_ID =
    (window as Window & { __DERIV_NEW_APP_ID__?: string }).__DERIV_NEW_APP_ID__ ||
    (window as Window & { __DERIV_OAUTH_CLIENT_ID__?: string }).__DERIV_OAUTH_CLIENT_ID__ ||
    '33Tz0wxIDfb62ywDERsKo';

export const DERIV_NEW_ACCESS_TOKEN_KEY = 'deriv.new_api.access_token';
export const DERIV_NEW_TOKEN_EXPIRY_KEY = 'deriv.new_api.token_expiry';
export const DERIV_NEW_ACCOUNT_KEY = 'deriv.new_api.active_account';

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

interface AccountsResponse {
    data?: DerivOptionsAccount[];
    errors?: Array<{ code?: string; message?: string; status?: number }>;
}

interface MigrationStatusResponse {
    data?: { status?: 'pending' | 'complete' | 'failed' | 'not_applicable' | string };
    errors?: Array<{ code?: string; message?: string; status?: number }>;
}

interface OtpResponse {
    data?: { url?: string; otp?: string };
    errors?: Array<{ code?: string; message?: string; status?: number }>;
}

export const saveDerivNewToken = (token: DerivNewToken): void => {
    localStorage.setItem(DERIV_NEW_ACCESS_TOKEN_KEY, token.access_token);
    if (token.expires_in && Number.isFinite(token.expires_in)) {
        localStorage.setItem(
            DERIV_NEW_TOKEN_EXPIRY_KEY,
            String(Date.now() + token.expires_in * 1000),
        );
    } else {
        localStorage.removeItem(DERIV_NEW_TOKEN_EXPIRY_KEY);
    }
};

export const getDerivNewToken = (): string | null => {
    const token = localStorage.getItem(DERIV_NEW_ACCESS_TOKEN_KEY);
    if (!token) return null;

    const expiry = Number(localStorage.getItem(DERIV_NEW_TOKEN_EXPIRY_KEY) || 0);
    if (expiry && Date.now() >= expiry) {
        clearDerivNewSession();
        return null;
    }

    return token;
};

export const clearDerivNewSession = (): void => {
    localStorage.removeItem(DERIV_NEW_ACCESS_TOKEN_KEY);
    localStorage.removeItem(DERIV_NEW_TOKEN_EXPIRY_KEY);
    localStorage.removeItem(DERIV_NEW_ACCOUNT_KEY);
};

const getHeaders = (): HeadersInit => {
    const token = getDerivNewToken();
    if (!token) throw new Error('Deriv New API session is not authenticated.');

    return {
        Authorization: `Bearer ${token}`,
        'Deriv-App-ID': DERIV_NEW_APP_ID,
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };
};

const parseResponse = async <T>(response: Response): Promise<T> => {
    const body = (await response.json().catch(() => ({}))) as T & {
        errors?: Array<{ code?: string; message?: string }>;
    };

    if (!response.ok) {
        const message = body.errors?.[0]?.message || `Deriv API request failed (${response.status}).`;
        throw new Error(message);
    }

    return body;
};

export const getOptionsAccounts = async (): Promise<DerivOptionsAccount[]> => {
    const response = await fetch(`${DERIV_NEW_API_BASE_URL}/trading/v1/options/accounts`, {
        headers: getHeaders(),
    });
    const body = await parseResponse<AccountsResponse>(response);
    return body.data || [];
};

export const getMigrationStatus = async (): Promise<MigrationStatusResponse['data']> => {
    const response = await fetch(
        `${DERIV_NEW_API_BASE_URL}/trading/v1/options/legacy/migration-status`,
        { headers: getHeaders() },
    );
    const body = await parseResponse<MigrationStatusResponse>(response);
    return body.data;
};

export const getOptionsWebSocketUrl = async (accountId: string): Promise<string> => {
    if (!accountId) throw new Error('A Deriv Options account ID is required.');

    const response = await fetch(
        `${DERIV_NEW_API_BASE_URL}/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
        {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({}),
        },
    );
    const body = await parseResponse<OtpResponse>(response);
    const url = body.data?.url;
    if (!url) throw new Error('Deriv did not return an authenticated WebSocket URL.');
    return url;
};

export const connectOptionsWebSocket = async (
    accountId: string,
): Promise<WebSocket> => {
    const url = await getOptionsWebSocketUrl(accountId);
    return new WebSocket(url);
};

export const setActiveOptionsAccount = (account: DerivOptionsAccount): void => {
    localStorage.setItem(DERIV_NEW_ACCOUNT_KEY, JSON.stringify(account));
};

export const getActiveOptionsAccount = (): DerivOptionsAccount | null => {
    try {
        const value = localStorage.getItem(DERIV_NEW_ACCOUNT_KEY);
        return value ? (JSON.parse(value) as DerivOptionsAccount) : null;
    } catch {
        return null;
    }
};

export const initializeDerivNewSession = async (): Promise<{
    accounts: DerivOptionsAccount[];
    migrationStatus?: MigrationStatusResponse['data'];
}> => {
    const accounts = await getOptionsAccounts();
    const active = getActiveOptionsAccount();
    if (!active || !accounts.some(account => account.account_id === active.account_id)) {
        const demo = accounts.find(account => account.account_type === 'demo' && account.status === 'active');
        const fallback = demo || accounts.find(account => account.status === 'active') || accounts[0];
        if (fallback) setActiveOptionsAccount(fallback);
    }

    let migrationStatus: MigrationStatusResponse['data'];
    try {
        migrationStatus = await getMigrationStatus();
    } catch (error) {
        // Migration status is diagnostic/compatibility information; don't make
        // a healthy New API account unusable when the temporary legacy endpoint
        // is unavailable.
        console.warn('[Deriv New API] Migration status unavailable:', error);
    }

    return { accounts, migrationStatus };
};
