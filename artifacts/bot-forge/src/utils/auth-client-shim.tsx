/**
 * Shim for @deriv-com/auth-client using Deriv OAuth 2.0 + PKCE.
 * The app keeps this compatibility surface while the trading layer migrates
 * from the Legacy Deriv API to the New API.
 */
import React, { useEffect } from 'react';
import Cookies from 'js-cookie';
import { saveDerivNewToken } from './deriv-new-api';

export interface OidcOptions {
    redirectCallbackUri?: string;
    postLoginRedirectUri?: string;
    postLogoutRedirectUri?: string;
    state?: unknown;
    login_code?: string;
}

export interface OAuth2LogoutOptions {
    redirectCallbackUri?: string;
    WSLogoutAndRedirect?: () => Promise<void>;
    postLogoutRedirectUri?: string;
}

export interface CallbackProps {
    onSignInSuccess?: (tokens: Record<string, string>, rawState?: unknown) => Promise<void>;
    renderReturnButton?: () => React.ReactNode;
}

const DERIV_AUTH_URL = 'https://auth.deriv.com/oauth2/auth';
const DERIV_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
const DERIV_PRODUCTION_ORIGIN = 'https://dqueenstraders.netlify.app';
const DERIV_TOKEN_EXCHANGE_FUNCTION = '/.netlify/functions/deriv-oauth-token';
const DERIV_OAUTH_CLIENT_ID =
    (window as any).__DERIV_OAUTH_CLIENT_ID__ || '33Tz0wxIDfb62ywDERsKo';
// Optional during the migration period. This is only sent to Deriv's OAuth
// authorization endpoint so Deriv can route legacy users appropriately. It is
// never exchanged for legacy account tokens by DQueens.
const DERIV_LEGACY_APP_ID = (window as any).__DERIV_APP_ID__ || '36300';
const PKCE_VERIFIER_KEY = 'deriv.oauth.pkce_verifier';
const OAUTH_STATE_KEY = 'deriv.oauth.state';
const OAUTH_PAYLOAD_KEY = 'deriv.oauth.payload';
const OAUTH_REDIRECT_URI_KEY = 'deriv.oauth.redirect_uri';

export const getDerivRedirectUri = (): string =>
    window.location.hostname === 'dqueenstraders.netlify.app'
        ? window.location.origin
        : `${window.location.origin}/callback`;

export const isDerivCallbackPage = (): boolean => {
    const pathname = window.location.pathname;
    const hasOAuthResponse = ['code', 'error', 'error_description'].some(param =>
        new URLSearchParams(window.location.search).has(param),
    );

    return (
        pathname === '/callback' ||
        pathname.endsWith('/callback') ||
        (window.location.hostname === 'dqueenstraders.netlify.app' &&
            (pathname === '/' || pathname === '') &&
            hasOAuthResponse)
    );
};

const toBase64Url = (bytes: Uint8Array): string => {
    let binary = '';
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const generateRandomValue = (length = 64): string => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
};

const createCodeChallenge = async (verifier: string): Promise<string> => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return toBase64Url(new Uint8Array(digest));
};

const exchangeAuthorizationCode = async (
    code: string,
    verifier: string,
    redirectUri: string,
): Promise<Record<string, string>> => {
    let tokenBody: Record<string, any>;

    if (window.location.origin === DERIV_PRODUCTION_ORIGIN) {
        const response = await fetch(DERIV_TOKEN_EXCHANGE_FUNCTION, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                code_verifier: verifier,
                redirect_uri: redirectUri,
            }),
        });
        tokenBody = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(tokenBody.error || `Sign-in exchange failed (${response.status}).`);
        }
    } else {
        const tokenResponse = await fetch(DERIV_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: DERIV_OAUTH_CLIENT_ID,
                code,
                code_verifier: verifier,
                redirect_uri: redirectUri,
            }),
        });
        tokenBody = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok) {
            throw new Error(tokenBody.error_description || tokenBody.error || `Token exchange failed (${tokenResponse.status}).`);
        }
    }

    if (!tokenBody.access_token) {
        throw new Error('The sign-in response did not include a New API access token.');
    }

    saveDerivNewToken({
        access_token: tokenBody.access_token,
        expires_in: Number(tokenBody.expires_in) || undefined,
        token_type: tokenBody.token_type || 'Bearer',
    });
    Cookies.set('logged_state', 'true');

    return {
        access_token: String(tokenBody.access_token),
        expires_in: String(tokenBody.expires_in ?? ''),
        token_type: String(tokenBody.token_type || 'Bearer'),
    };
};

export async function requestOidcAuthentication(options: OidcOptions = {}): Promise<void> {
    const { redirectCallbackUri = getDerivRedirectUri(), state, login_code } = options;
    const verifier = generateRandomValue();
    const oauthState = generateRandomValue(32);
    const challenge = await createCodeChallenge(verifier);

    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(OAUTH_STATE_KEY, oauthState);
    sessionStorage.setItem(OAUTH_PAYLOAD_KEY, JSON.stringify(state ?? null));
    sessionStorage.setItem(OAUTH_REDIRECT_URI_KEY, redirectCallbackUri);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: DERIV_OAUTH_CLIENT_ID,
        redirect_uri: redirectCallbackUri,
        scope: 'trade account_manage',
        state: oauthState,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        brand: 'deriv',
    });

    if (DERIV_LEGACY_APP_ID) params.set('app_id', DERIV_LEGACY_APP_ID);
    if (login_code) params.set('login_code', login_code);

    window.location.href = `${DERIV_AUTH_URL}?${params.toString()}`;
}

export async function OAuth2Logout(options: OAuth2LogoutOptions = {}): Promise<void> {
    const { WSLogoutAndRedirect, postLogoutRedirectUri = window.location.origin } = options;
    try {
        if (WSLogoutAndRedirect) await WSLogoutAndRedirect();
    } catch {
        // ignore logout transport failures
    }

    localStorage.removeItem('accountsList');
    localStorage.removeItem('clientAccounts');
    localStorage.removeItem('authToken');
    localStorage.removeItem('active_loginid');
    localStorage.removeItem('deriv.new_api.access_token');
    localStorage.removeItem('deriv.new_api.token_expiry');
    localStorage.removeItem('deriv.new_api.active_account');
    Cookies.set('logged_state', 'false');
    window.location.href = postLogoutRedirectUri;
}

export const Callback: React.FC<CallbackProps> = ({ onSignInSuccess, renderReturnButton }) => {
    const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = React.useState('');
    const callbackStarted = React.useRef(false);

    useEffect(() => {
        if (callbackStarted.current) return;
        callbackStarted.current = true;

        const completeSignIn = async () => {
            const params = new URLSearchParams(window.location.search);
            const oauthError = params.get('error_description') || params.get('error');
            if (oauthError) throw new Error(oauthError);

            const code = params.get('code');
            if (!code) throw new Error('No OAuth authorization code was received from Deriv.');

            const returnedState = params.get('state');
            const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
            const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
            const redirectUri =
                sessionStorage.getItem(OAUTH_REDIRECT_URI_KEY) || getDerivRedirectUri();

            if (!returnedState || !expectedState || returnedState !== expectedState) {
                throw new Error('The sign-in response could not be verified. Please try again.');
            }
            if (!verifier) throw new Error('The sign-in session expired. Please try again.');

            let rawState: unknown = null;
            try {
                rawState = JSON.parse(sessionStorage.getItem(OAUTH_PAYLOAD_KEY) || 'null');
            } catch {
                rawState = null;
            }

            const tokens = await exchangeAuthorizationCode(code, verifier, redirectUri);
            await onSignInSuccess?.(tokens, rawState);
            setStatus('success');
        };

        completeSignIn()
            .catch((err: unknown) => {
                console.error('[Callback] New API sign-in error:', err);
                setStatus('error');
                setErrorMsg(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
            })
            .finally(() => {
                sessionStorage.removeItem(PKCE_VERIFIER_KEY);
                sessionStorage.removeItem(OAUTH_STATE_KEY);
                sessionStorage.removeItem(OAUTH_PAYLOAD_KEY);
                sessionStorage.removeItem(OAUTH_REDIRECT_URI_KEY);
            });
    }, [onSignInSuccess]);

    if (status === 'loading') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
                <div>Completing sign in…</div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', gap: 16 }}>
                <div style={{ color: '#e44' }}>Sign in error: {errorMsg}</div>
                {renderReturnButton?.()}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
            <div>Sign in successful. Redirecting…</div>
        </div>
    );
};
