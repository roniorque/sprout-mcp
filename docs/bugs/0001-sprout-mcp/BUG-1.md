# BUG-1: Upgrade vulnerable devDependencies (vitest + vite)

**Engagement:** 0001-sprout-mcp
**Source:** SEC-001 (Phase 8 security audit)
**Severity:** High
**Status:** open

## Problem

`npm audit` reports:
- `vitest@^2.1.0` — **Critical** (CWE-862: Missing Authorization). The vitest dev server can expose local filesystem contents to unauthorized callers when running in an accessible network context.
- `vite` (transitive via vitest) — **High** (CWE-22: Path Traversal in `.map` handling; CWE-73/CWE-522: NTLMv2 hash disclosure via UNC paths on Windows).
- `esbuild` (transitive via vite) — **Moderate** (CWE-346: Origin Validation Error in dev server).

All affected packages are `devDependencies` — they do not ship in the production `dist/`. Risk is limited to the local development environment during `npm test`.

## Fix

Upgrade `vitest` to `^4.1.10` in `devDependencies`. This resolves all three CVEs transitively.

```bash
npm install -D vitest@^4.1.10
npm test
```

Expected: `npm audit` reports 0 critical, 0 high. All 8 tests pass.

## Acceptance criteria

- [ ] `vitest` in `package.json` devDependencies is `^4.1.10` or higher
- [ ] `npm audit` shows 0 critical, 0 high vulnerabilities
- [ ] `npm test` passes (8/8)
- [ ] No `vitest.config.ts` API changes needed (v4 is backward-compatible for this project's usage)
