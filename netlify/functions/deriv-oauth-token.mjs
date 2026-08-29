const DERIV_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
const DERIV_LEGACY_TOKENS_URL = 'https://auth.deriv.com/oauth2/legacy/tokens';
const DERIV_OAUTH_CLIENT_ID = '33Tz0wxIDfb62ywDERsKo';
const PRODUCTION_ORIGIN = 'https://dqueenstraders.netlify.app';

const jsonResponse = (body, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
        },
    });

export default async request => {
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed.' }, 405);
    }

    const origin = request.headers.get('origin');
    if (origin && origin !== PRODUCTION_ORIGIN) {
        return jsonResponse({ error: 'Origin not allowed.' }, 403);
    }

    let payload;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid request body.' }, 400);
    }

    const { code, code_verifier: codeVerifier, redirect_uri: redirectUri } = payload ?? {};
    if (
        typeof code !== 'string' ||
        typeof codeVerifier !== 'string' ||
        redirectUri !== PRODUCTION_ORIGIN
    ) {
        return jsonResponse({ error: 'Invalid OAuth exchange request.' }, 400);
    }

    try {
        const tokenResponse = await fetch(DERIV_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: DERIV_OAUTH_CLIENT_ID,
                code,
                code_verifier: codeVerifier,
                redirect_uri: redirectUri,
            }),
        });
        const tokenBody = await tokenResponse.json().catch(() => ({}));

        if (!tokenResponse.ok || !tokenBody.access_token) {
            return jsonResponse(
                {
                    error: tokenBody.error_description || tokenBody.error || 'Token exchange failed.',
                },
                tokenResponse.ok ? 502 : tokenResponse.status
            );
        }

        const legacyResponse = await fetch(DERIV_LEGACY_TOKENS_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokenBody.access_token}` },
        });
        const legacyTokens = await legacyResponse.json().catch(() => ({}));

        if (!legacyResponse.ok) {
            return jsonResponse(
                {
                    error:
                        legacyTokens.error_description ||
                        legacyTokens.error ||
                        'Account token exchange failed.',
                },
                legacyResponse.status
            );
        }

        return jsonResponse(legacyTokens);
    } catch (error) {
        console.error('[Deriv OAuth] Exchange failed:', error);
        return jsonResponse({ error: 'Unable to contact Deriv authentication.' }, 502);
    }
};