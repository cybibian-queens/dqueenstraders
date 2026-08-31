import { getAppId, getSocketURL } from '@/components/shared';
import { getInitialLanguage } from '@deriv-com/translations';
import { getActiveOptionsAccount, getDerivNewToken, getOptionsWebSocketUrl } from '@/utils/deriv-new-api';

const PUBLIC_OPTIONS_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';

/**
 * Creates the socket used by the Bot Forge API layer.
 *
 * Authenticated sessions obtain a fresh, account-specific OTP URL from the
 * New Options API. Unauthenticated chart/public sessions use the public
 * Options WebSocket. No legacy /websockets/v3 URL is used here.
 */
export const generateDerivApiInstance = async () => {
    const token = getDerivNewToken();
    let socket_url = PUBLIC_OPTIONS_WS;

    if (token) {
        const account = getActiveOptionsAccount();
        if (!account?.account_id) throw new Error('No active Deriv Options account is selected.');
        socket_url = await getOptionsWebSocketUrl(account.account_id);
    }

    const connection = new WebSocket(socket_url);
    const listeners = new Set<(message: unknown) => void>();

    connection.addEventListener('message', event => {
        try {
            listeners.forEach(listener => listener(JSON.parse(event.data)));
        } catch {
            // Ignore non-JSON socket frames.
        }
    });

    const subscriptions = new Map<string, { unsubscribe: () => void }>();
    let requestId = 0;

    const send = (request: Record<string, unknown>) => {
        const req_id = request.req_id ?? ++requestId;
        const payload = { ...request, req_id };
        connection.send(JSON.stringify(payload));

        if (request.subscribe) {
            const subscriptionId = `req-${req_id}`;
            const subscription = {
                id: subscriptionId,
                unsubscribe: () => subscriptions.delete(subscriptionId),
            };
            subscriptions.set(subscriptionId, subscription);
            return Promise.resolve({ subscription });
        }
        return Promise.resolve({});
    };

    return {
        connection,
        send,
        disconnect: () => connection.close(),
        onMessage: () => ({
            subscribe: (callback: (message: unknown) => void) => {
                listeners.add(callback);
                return { unsubscribe: () => listeners.delete(callback) };
            },
        }),
        getSelfExclusion: async () => ({ error: { code: 'Unsupported' } }),
        // Kept only as a compatibility-shaped method for code that expects an API object.
        // Authentication is performed by the OTP URL, never by authorize().
        authorize: async () => {
            const account = getActiveOptionsAccount();
            return { authorize: account, error: null };
        },
    };
};

export const getLoginId = () => getActiveOptionsAccount()?.account_id ?? null;
export const V2GetActiveToken = () => getDerivNewToken();
export const V2GetActiveClientId = () => getActiveOptionsAccount()?.account_id ?? null;

export const getToken = () => ({
    token: getDerivNewToken() ?? undefined,
    account_id: getActiveOptionsAccount()?.account_id ?? undefined,
});

// Retained for older callers that import these helpers; they no longer build a legacy socket.
export const getLegacySocketConfig = () => ({
    appId: getAppId(),
    socket: getSocketURL(),
    language: getInitialLanguage(),
});
