status: complete
scope: engagement
engagement_slug: 0001-sprout-mcp
zones_done:
  - backend/
  - deps/
  - infra/
zones_pending: []
zone_coverage:
  backend/:
    total: 7
    tested: 7
    skipped: 0
    pending: 0
  deps/:
    total: 2
    tested: 2
    skipped: 0
    pending: 0
  infra/:
    total: 1
    tested: 1
    skipped: 0
    pending: 0
files_tested:
  - src/server.ts
  - src/tools/list-library.ts
  - src/tools/registry.ts
  - src/tools/types.ts
  - scripts/fetch-docs.ts
  - scripts/diagnose.ts
  - scripts/debug-api.ts
  - package.json
  - package-lock.json (scanner-only)
  - .gitignore
files_skipped:
  - path: tests/list-library.test.ts
    reason: test-only
  - path: tests/registry.test.ts
    reason: test-only
osint_scope: []
osint_complete: true
osint_note: No new public surface deployed in this engagement (Railway issue 0007 deferred). OSINT skipped.
findings:
  - id: SEC-001
    cwe: "CWE-862, CWE-22, CWE-200"
    severity: High
    summary: Vulnerable devDependencies — vitest (Critical CWE-862), vite (High CWE-22/CWE-200)
    file_or_source: package.json
  - id: SEC-002
    cwe: CWE-538
    severity: Medium
    summary: Diagnostic output files (diagnostic-full.html, debug-response-*.txt) not in .gitignore — contain 3rd-party New Relic key and Sprout API schema
    file_or_source: .gitignore
  - id: SEC-003
    cwe: CWE-937
    severity: Low
    summary: "@modelcontextprotocol/sdk pinned to floating 'latest' tag"
    file_or_source: package.json
  - id: SEC-004
    cwe: "(false positive)"
    severity: Info
    summary: Semgrep path-traversal warnings on registry.ts are false positives — slugify() sanitizes all file paths
    file_or_source: src/tools/registry.ts
  - id: SEC-005
    cwe: "(accepted design risk)"
    severity: Info
    summary: No MCP server auth (v1 constraint, documented in PRD)
    file_or_source: src/server.ts
scanner_runs:
  - tool: npm-audit
    target: package-lock.json
    result: 1 critical (vitest CWE-862), 1 high (vite CWE-22), 3 moderate — SEC-001
  - tool: semgrep
    target: src/, scripts/
    result: 4 warnings, all false positives — SEC-004
  - tool: gitleaks
    target: working tree (no-git)
    result: 2 hits in diagnostic-full.html (New Relic browser key from 3rd-party site) — SEC-002
scanner_skips:
  - "skipped: pip-audit — no Python dependencies"
  - "skipped: trufflehog — gitleaks used instead"
  - "skipped: subfinder — OSINT scope N/A (no new public surface deployed)"
report_draft: docs/security/0001-sprout-mcp/0001-security-report.md
started: Wednesday, Jul 30, 2026, 6:00 AM (UTC+8)
last_checkpoint: Wednesday, Jul 30, 2026, 6:00 AM (UTC+8)
