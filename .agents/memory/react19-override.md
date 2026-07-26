---
name: Workspace pnpm overrides for React 19
description: Some @deriv-com packages install React 17/18 as a direct dep. Force a single React version via pnpm overrides.
---

## Rule
Add to workspace root `package.json`:
```json
"pnpm": {
  "overrides": {
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}
```

**Why:** `@deriv-com/quill-ui`, `@deriv-com/ui`, etc. have `react@^17 || ^18` in their deps (not peerDeps), causing pnpm to install additional React copies. Combined with the workspace catalog pinning React 19, this creates multiple React instances and crashes with `ReactCurrentDispatcher` errors.

**How to apply:** Add overrides to root `package.json` and run `pnpm install`. Also set `resolve.dedupe: ['react', 'react-dom']` in any artifact's vite.config.ts that uses these packages.
