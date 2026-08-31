import DerivAPIBasic from '@deriv/deriv-api/dist/DerivAPIBasic';
import { getActiveOptionsAccount, getDerivNewToken, getOptionsWebSocketUrl } from '@/utils/deriv-new-api';

const PUBLIC_OPTIONS_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';

/**
 * Creates the Bot Forge API client on the current Deriv Options WebSocket.
 * Authenticated sessions obtain a fresh account-specific OTP URL from the
 * New API. Public sessions use the New API public endpoint.
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
    return new DerivAPIBasic({ connection });
};

export const getLoginId = () => getActiveOptionsAccount()?.account_id ?? null;
export const V2GetActiveToken = () => getDerivNewToken();
export const V2GetActiveClientId = () => getActiveOptionsAccount()?.account_id ?? null;

export const getToken = () => ({
    token: getDerivNewToken() ?? undefined,
    account_id: getActiveOptionsAccount()?.account_id ?? undefined,
});
