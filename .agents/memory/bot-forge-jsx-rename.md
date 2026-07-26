---
name: Bot Forge — .js files with JSX must be renamed to .jsx
description: Vite/esbuild misparses TypeScript generics as JSX when .js files contain JSX but are loaded as plain JS.
---

## Rule
After copying ddbotforge source files, rename any `.js` file containing JSX syntax to `.jsx`.

**Why:** The original rsbuild config told esbuild to treat `.js` as JSX. Vite does not do this by default. If you add `esbuild: { loader: 'tsx' }` globally, TypeScript generics (`<T>`) in `.ts` files break ("The character '>' is not valid inside a JSX element").

**How to apply:**
```sh
find artifacts/bot-forge/src -name "*.js" | while read f; do
  if grep -qP "<[A-Z][a-zA-Z]*|<[a-z]+\s[a-z]|React\.createElement|jsxDEV" "$f"; then
    mv "$f" "${f%.js}.jsx"
  fi
done
```
Do NOT add `esbuild.loader` globally — only rename affected files.
