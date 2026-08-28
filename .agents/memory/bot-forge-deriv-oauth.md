---
name: Bot Forge Deriv OAuth
description: Current Deriv OAuth requirements for custom Bot Forge deployments.
---

Custom deployments must use Deriv's OAuth 2.0 Authorization Code flow with PKCE at `auth.deriv.com`. The OAuth client ID is distinct from the numeric legacy App ID used by Deriv WebSocket connections; both may be included for legacy account compatibility.

**Why:** The retired `oauth.deriv.com/oauth2/authorize` endpoint redirects away from authentication, and deriving an OAuth hostname from a Netlify domain creates the invalid `oauth.netlify.app` host.

**How to apply:** Keep WebSocket configuration on the numeric legacy App ID, use the separate public OAuth client ID for PKCE, validate state, and exchange the authorization code before converting it to legacy account tokens.