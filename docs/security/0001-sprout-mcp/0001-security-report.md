# Security Report 0001 — Sprout MCP Server

**Engagement:** `0001-sprout-mcp`
**Date:** Wednesday, Jul 30, 2026, 6:00 AM (UTC+8)
**Scope:** engagement (zones changed by this build)
**Methodology:** OWASP ASVS L1, CWE taxonomy, semgrep + gitleaks + npm audit
**Status:** complete

---

## Zone Coverage

| Zone | Total | Tested | Skipped | Pending |
|------|-------|--------|---------|---------|
| `backend/` (src/ + scripts/) | 7 | 7 | 0 | 0 |
| `deps/` | 2 | 2 | 0 | 0 |
| `infra/` | 1 | 1 | 0 | 0 |
| `osint/` | N/A | — | — | — |

OSINT zone not applicable: no new public surface deployed in this engagement (Railway issue 0007 deferred).

---

## Scanner Runs

| Tool | Target | Result |
|------|--------|--------|
| `npm audit` | `package-lock.json` | 1 critical, 1 high, 3 moderate — see SEC-001 |
| `semgrep --config auto` | `src/`, `scripts/` | 4 warnings — all false positives, see SEC-004 |
| `gitleaks` | working tree (no-git) | 2 hits in `diagnostic-full.html` — see SEC-002 |

**Scanner skips:**
- `skipped: pip-audit — no Python dependencies`
- `skipped: trufflehog — gitleaks used instead`
- `skipped: subfinder — OSINT scope N/A (no new public surface deployed)`

---

## Findings

### SEC-001 — HIGH | deps | CWE-862, CWE-22, CWE-200

**Vulnerable devDependencies: vitest, vite**

`npm audit` reports:
- `vitest@^2.1.0` (devDependency): **Critical** — CWE-862 Missing Authorization. The vitest dev server can be accessed without authorization in certain configurations.
- `vite` (transitive devDependency via vitest): **High** — CWE-22 Path Traversal in optimized deps `.map` handling (GHSA-4w7w-66w2-5vf9); CWE-73/CWE-522 NTLMv2 hash disclosure via UNC path on Windows (GHSA-v6wh-96g9-6wx3).
- `esbuild` (transitive via vite): **Moderate** — CWE-346 Origin Validation Error.

**Context:** All affected packages are devDependencies — they are not present in `dist/` and do not run in the deployed production server. Risk is limited to the local development environment during `npm test`. Nevertheless, the vitest authorization bypass can expose local filesystem contents via the vitest dev server if it is started in an accessible network context.

**Fix:** Upgrade `vitest` from `^2.1.0` to `^4.1.10` in `devDependencies`. This upgrades vite and esbuild transitively and resolves all reported CVEs. The `vitest` v4 API is compatible; test files do not need changes.

```bash
npm install -D vitest@^4.1.10
npm test  # verify 8/8 pass
```

**References:**
- GHSA-4w7w-66w2-5vf9 (vite path traversal)
- GHSA-v6wh-96g9-6wx3 (vite NTLM)
- GHSA-67mh-4wv8-2f99 (esbuild CORS)

---

### SEC-002 — MEDIUM | infra | CWE-538

**Diagnostic output files not in `.gitignore`**

The following files are produced by debug scripts and exist in the project root. None are listed in `.gitignore`:
- `diagnostic-full.html` — full HTML from the Sprout docs site (contains a New Relic browser license key `NRJS-8482e4e3e1750395f5d` belonging to the Sprout docs site)
- `diagnostic-output.txt` — DOM structure dump
- `debug-response-collection-api.txt` — raw Postman collection API response (~2.9 MB of Sprout API schema data)
- `debug-response-metadata-api.txt` — Postman metadata API response

Gitleaks flagged `diagnostic-full.html` for the New Relic key. While New Relic browser agent license keys are public-facing (embedded in every page load), committing a third-party's infrastructure key to this repo is inadvisable. More critically, `debug-response-collection-api.txt` contains the full Sprout API reference including endpoint patterns that may aid reconnaissance if the project repo is ever made public.

**Fix:** Add patterns to `.gitignore`:
```
diagnostic-*.html
diagnostic-*.txt
debug-response-*.txt
```

---

### SEC-003 — LOW | deps | CWE-937

**Floating `latest` tag on `@modelcontextprotocol/sdk`**

`package.json` pins `@modelcontextprotocol/sdk` to `"latest"`, a floating tag. If the upstream package releases a breaking change or (in a supply-chain compromise scenario) a malicious version, `npm install` from a fresh clone would pull it. The `package-lock.json` provides a partial mitigation (the exact version is frozen), but `npm install --legacy-peer-deps` or forced updates bypass this.

**Fix:** Replace `"latest"` with the current pinned semver range (e.g., `"^1.x.x"` based on what `package-lock.json` currently resolves to). Run `node -e "console.log(require('./node_modules/@modelcontextprotocol/sdk/package.json').version)"` to get the current version.

---

### SEC-004 — INFO | backend | (false positive)

**Semgrep path-traversal warnings are false positives**

Semgrep flagged `path.join(dataDir, section.file)` in `registry.ts:68` as a potential path traversal because `section.file` originates from parsed JSON. However, `section.file` values are exclusively written by `fetch-docs.ts` via the `slugify()` function, which restricts output to `[a-z0-9_]+.json`. No user input or external attacker can influence `section.file` at runtime — `_index.json` is a build artifact written to `src/data/` (which is in `.gitignore` and regenerated locally only). No action required.

Similarly, `path.join(dataDir, "_index.json")` in `list-library.ts:7` and `registry.ts:56` — `dataDir` is a static compile-time path (`path.join(process.cwd(), "src", "data")`), not user input.

---

### SEC-005 — INFO | backend | (accepted design risk)

**No MCP server authentication**

The MCP server exposes no authentication on the `/mcp` endpoint. Any process that can reach `http://localhost:{PORT}/mcp` can call all tools. This is explicitly Out of Scope in the PRD for v1: *"No authentication required on the MCP server for v1, so that setup is as simple as possible."*

Accepted risk for local-only deployment. When Railway deployment is implemented (issue 0007), this must be revisited: the Railway-hosted endpoint will be publicly reachable, and at minimum a shared bearer token or IP allowlist should be added.

---

## Findings Summary

| ID | Severity | Category | Summary |
|----|----------|----------|---------|
| SEC-001 | **High** | dependencies | Vulnerable devDeps: vitest (Critical CWE-862) + vite (High CWE-22) |
| SEC-002 | Medium | infra/secrets | Debug artifacts not in `.gitignore` — contain 3rd-party key + API schema |
| SEC-003 | Low | dependencies | `@modelcontextprotocol/sdk` pinned to floating `latest` tag |
| SEC-004 | Info | backend | Semgrep path-traversal warnings are false positives |
| SEC-005 | Info | backend | No MCP auth (accepted v1 design constraint) |

---

## Recommendations

1. **Upgrade vitest** to `^4.1.10` (resolves SEC-001). See `docs/bugs/0001-sprout-mcp/BUG-1.md`.
2. **Update `.gitignore`** to exclude diagnostic output files (resolves SEC-002).
3. **Pin `@modelcontextprotocol/sdk`** to a specific semver range (resolves SEC-003).
4. **Before Railway deployment** (issue 0007): add MCP server authentication (SEC-005).
