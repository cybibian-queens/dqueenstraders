# Deriv Digits Trading App

A binary options/digits trading interface for the Deriv platform, ported from a Netlify-hosted Next.js app into Replit's pnpm workspace as a Vite + React app.

## Run & Operate

- `pnpm --filter @workspace/trading-app run dev` — run the trading app (preview at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite 7, Tailwind CSS v4, wouter (routing)
- Shared lib: `@deriv/core` (workspace package at `lib/deriv-core`) — WebSocket, OAuth PKCE, auth storage
- Design tokens: RGB-space CSS variables (`--primary: 211 131 1`) consumed via `rgb(var(--primary))`

## Where things live

- `artifacts/trading-app/src/` — main app source (components, hooks, pages, lib)
- `artifacts/trading-app/src/hooks/use-auth.ts` — OAuth PKCE auth hook wired to `@deriv/core`
- `lib/deriv-core/src/` — shared Deriv auth, WebSocket, and account management package
- `artifacts/trading-app/public/` — static assets (logo.png, icon.svg, app-config.json)

## Architecture decisions

- Routing: wouter replaces `next/navigation` and `next/link`; base path from `import.meta.env.BASE_URL`
- Env vars: all `NEXT_PUBLIC_*` converted to `VITE_*` (e.g. `VITE_DERIV_APP_ID`, `VITE_DERIV_REDIRECT_URI`)
- `@deriv/core` is resolved as a workspace package — TypeScript reads source directly, no build step needed
- `lib/deriv-core/tsconfig.json` includes `@types/react` as a devDependency for the React hook files

## User preferences

- The source app was hosted on **Netlify** (not Vercel) — refer to it as the Netlify app.

## Gotchas

- `VITE_DERIV_APP_ID` and `VITE_DERIV_REDIRECT_URI` must be set for trading to work; `EnvCheck` shows a toast when missing (expected in dev without secrets configured).
- `getWebSocketOTP(accountId, authInfo, clientId)` returns a WS URL string directly — not an object.
- `refreshAccessToken(refreshToken, clientId)` takes the raw refresh token string, not the full `AuthInfo` object.
