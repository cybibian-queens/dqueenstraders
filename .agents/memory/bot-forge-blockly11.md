---
name: Bot Forge Blockly 11 compatibility
description: Non-obvious compatibility rules for the migrated legacy DBot Blockly runtime.
---

Blockly 11 is ESM-only and has no default export. Legacy DBot code expects a mutable global namespace and private APIs that may have moved or disappeared. Initialization paths must reject explicitly and always clear global loading state.

**Why:** Assigning the missing default export made `window.Blockly` undefined; later, a missing workspace container returned from a Promise executor without resolving or rejecting, leaving every route under a permanent loader.

**How to apply:** Build a mutable global from the module namespace, guard obsolete private-API overrides, use the Vite base path instead of webpack globals, and wrap workspace initialization with loader cleanup in `finally`.