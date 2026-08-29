/**
 * Shim for @deriv-com/auth-client
 * The real package bundles React 17 internally which conflicts with React 19.
 * This shim provides the same API surface using the app's React instance.
 */
import React, { useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Deriv OAuth helpers ────────────────────────────────────────────────────────

const DERIV_AUTH_URL = 'https://auth.deriv.com/oauth2/auth';
const DERIV_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
const DERIV_LEGACY_TOKENS_URL = 'https://auth.deriv.com/oauth2/legacy/tokens';
const DERIV_PRODUCTION_ORIGIN = 'https://dqueenstraders.netlify.app';
const DERIV_TOKEN_EXCHANGE_FUNCTION = '/.netlify/functions/deriv-oauth-token';
const DERIV_OAUTH_CLIENT_ID = (window as any).__DERIV_OAUTH_CLIENT_ID__ || '33Tz0wxIDfb62ywDERsKo';
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
        new URLSearchParams(window.location.search).has(param)
    );

    return pathname === '/callback' || pathname.endsWith('/callback') ||
        (window.location.hostname === 'dqueenstraders.netlify.app' &&
            (pathname === '/' || pathname === '') &&
            hasOAuthResponse);
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
    redirectUri: string
): Promise<Record<string, string>> => {
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
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.error || `Sign-in exchange failed (${response.status}).`);
        }
        return body;
    }

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
    if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed (${tokenResponse.status}).`);
    }

    const tokenBody = await tokenResponse.json();
    if (!tokenBody.access_token) {
        throw new Error('The sign-in response did not include an access token.');
    }

    const legacyResponse = await fetch(DERIV_LEGACY_TOKENS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    if (!legacyResponse.ok) {
        throw new Error(`Account token exchange failed (${legacyResponse.status}).`);
    }
    return legacyResponse.json();
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
        app_id: DERIV_LEGACY_APP_ID,
        brand: 'deriv',
    });
    if (login_code) params.set('login_code', login_code);

    const url = `${DERIV_AUTH_URL}?${params}`;
    window.location.href = url;
}

export async function OAuth2Logout(options: OAuth2LogoutOptions = {}): Promise<void> {
    const { WSLogoutAndRedirect, postLogoutRedirectUri = window.location.origin } = options;
    try {
        if (WSLogoutAndRedirect) {
            await WSLogoutAndRedirect();
        }
    } catch {
        // ignore
    }
    // Clear local auth state
    localStorage.removeItem('accountsList');
    localStorage.removeItem('clientAccounts');
    localStorage.removeItem('authToken');
    localStorage.removeItem('active_loginid');
    window.location.href = postLogoutRedirectUri;
}

// ── Callback component ─────────────────────────────────────────────────────────

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

            let tokens: Record<string, string>;
            let rawState: unknown = null;
            const code = params.get('code');

            if (code) {
                const returnedState = params.get('state');
                const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
                const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
                const redirectUri =
                    sessionStorage.getItem(OAUTH_REDIRECT_URI_KEY) || getDerivRedirectUri();

                if (!returnedState || !expectedState || returnedState !== expectedState) {
                    throw new Error('The sign-in response could not be verified. Please try again.');
                }
                if (!verifier) {
                    throw new Error('The sign-in session expired. Please try again.');
                }

                try {
                    rawState = JSON.parse(sessionStorage.getItem(OAUTH_PAYLOAD_KEY) || 'null');
                } catch {
                    rawState = null;
                }

                tokens = await exchangeAuthorizationCode(code, verifier, redirectUri);
            } else {
                // Continue to accept the legacy callback format while existing
                // sessions and older Deriv redirects age out.
                tokens = {};
                params.forEach((value, key) => {
                    if (/^(acct|token|cur)\d+$/.test(key)) tokens[key] = value;
                });
            }

            if (!Object.keys(tokens).length) {
                throw new Error('No account tokens were received from Deriv.');
            }

            await onSignInSuccess?.(tokens, rawState);
            setStatus('success');
        };

        completeSignIn()
            .catch((err: unknown) => {
                console.error('[Callback] sign-in error:', err);
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
