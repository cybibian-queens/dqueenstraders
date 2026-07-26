/**
 * Shim for @deriv-com/auth-client
 * The real package bundles React 17 internally which conflicts with React 19.
 * This shim provides the same API surface using the app's React instance.
 */
import React, { useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OidcOptions {
    redirectCallbackUri?: string;
    postLogoutRedirectUri?: string;
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

const DERIV_OAUTH_URL = 'https://oauth.deriv.com/oauth2/authorize';
const DERIV_APP_ID = (window as any).__DERIV_APP_ID__ || '36300';

export async function requestOidcAuthentication(options: OidcOptions = {}): Promise<void> {
    const { redirectCallbackUri = `${window.location.origin}/callback` } = options;
    const params = new URLSearchParams({
        app_id: DERIV_APP_ID,
        l: 'EN',
        brand: 'deriv',
    });
    if (redirectCallbackUri) params.set('redirect_uri', redirectCallbackUri);
    const url = `${DERIV_OAUTH_URL}?${params}`;
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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        // Build token map: acct1→loginid, token1→token, cur1→currency, etc.
        const tokens: Record<string, string> = {};
        params.forEach((value, key) => {
            tokens[key] = value;
        });

        // Parse state if present
        let rawState: unknown = null;
        const stateStr = params.get('state');
        if (stateStr) {
            try { rawState = JSON.parse(decodeURIComponent(stateStr)); } catch { /* ignore */ }
        }

        if (Object.keys(tokens).length === 0) {
            setStatus('error');
            setErrorMsg('No tokens received from OAuth provider.');
            return;
        }

        if (onSignInSuccess) {
            onSignInSuccess(tokens, rawState)
                .then(() => setStatus('success'))
                .catch((err: unknown) => {
                    console.error('[Callback] onSignInSuccess error:', err);
                    setStatus('error');
                    setErrorMsg('Authentication failed. Please try again.');
                });
        } else {
            setStatus('success');
        }
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
