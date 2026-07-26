---
name: Bot Forge — extra npm dependencies required
description: Packages from ddbotforge codebase that are not in the zip's package.json but are imported by the source.
---

## Missing packages (must add to artifacts/bot-forge/package.json)
- `i18next` + `react-i18next` — peer deps of @deriv-com/translations
- `immutable` — used by bot-skeleton observer.js
- `rxjs` — used by connection-status-stream.ts
- `redux` + `redux-thunk` — used in external bot-skeleton
- `lodash.debounce` — specific lodash sub-package (not lodash)
- `history` — react-router peer
- `object.fromentries` — polyfill used in some files
- `prop-types` — used by some legacy components
- `ua-parser-js` — user-agent detection
- `usehooks-ts` — React hook library
- `react-loadable` — used in lazy-load utility
- `react-div-100vh` — used in shared_ui/div100vh-container
- `@deriv/deriv-charts` + `@deriv/api-types` — charts and API types
- `@deriv-com/quill-ui-next` — next-gen Quill UI components
- `trackjs` — error tracking (use version ^3.10.4, not 3.10.8)

**Why:** The original ddbotforge used rsbuild with its own monorepo; not all transitive deps were explicit in package.json.
