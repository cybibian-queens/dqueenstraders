---
name: Bot Forge React 19 compatibility
description: React 19 compatibility rules for Deriv packages and browser-side react-dom/server usage.
---

## Rule
Keep both `@deriv-com/auth-client` and `@deriv-com/quill-ui` behind local React 19-compatible shims. Ensure browser imports of `react-dom/server` resolve to React DOM's browser entry.

**Why:** Auth Client and Quill UI bundle older React runtimes that crash under React 19 with dispatcher/internal-hook errors. A broad `react-dom` alias can also route `react-dom/server` to the Node build, causing `util.TextEncoder is not a constructor` in browsers.

**How to apply:**
When adding or changing these packages, retain their local aliases and keep the browser-specific `react-dom/server` alias more specific than the general `react-dom` alias. Do not patch React internals or re-enable the packages directly without a full browser startup test.
