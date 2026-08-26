---
name: Bot Forge Netlify source shims
description: Deployment risk from source files stored under directories covered by generic ignore rules
---

Required Bot Forge runtime shims must be explicitly tracked when they live under a directory matched by the repository's generic `tmp` ignore rule.

**Why:** Local builds can pass because ignored files remain on disk, while Netlify builds run from a clean Git clone and fail with a missing-module error.

**How to apply:** When a production-only missing-module error references an ignored source path, check `git check-ignore`, then add a narrow negation and track only the imported runtime file rather than unignoring the whole temporary directory.