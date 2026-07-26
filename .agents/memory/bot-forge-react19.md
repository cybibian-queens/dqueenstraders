---
name: Bot Forge — @deriv-com/auth-client React conflict
description: The @deriv-com/auth-client package bundles React 17 in its dist, causing ReactCurrentDispatcher crash with React 19 apps.
---

## Rule
Never import `@deriv-com/auth-client` directly in the bot-forge artifact. Always alias it to the local shim.

**Why:** The package's dist file bundles a private copy of React 17/18. When Vite pre-bundles it, two React instances end up in the browser, causing `Cannot read properties of undefined (reading 'ReactCurrentDispatcher')`.

**How to apply:**
In `artifacts/bot-forge/vite.config.ts` under `resolve.alias`:
```
'@deriv-com/auth-client': path.resolve(import.meta.dirname, 'src/utils/auth-client-shim.tsx'),
```
The shim at `src/utils/auth-client-shim.tsx` implements `requestOidcAuthentication`, `OAuth2Logout`, and the `Callback` component using the app's React.
