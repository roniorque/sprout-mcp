# Issue 0006: Unit tests

**Last updated:** Tuesday, Jul 29, 2026, 5:00 PM (UTC+8)

## What to build

Write the vitest unit test suite covering the three core tool behaviors. All tests use fixture data — no network calls, no Playwright, no live Sprout docs.

**Test 1 — `list_library` output:**
- Seed `src/data/_index.json` with a fixture containing 2 groups and 3 sections
- Call the `list_library` tool handler directly
- Assert the response string contains the correct group labels, section names, and tool names from the fixture

**Test 2 — Domain tool output:**
- Seed a fixture `src/data/hr_employees.json` with 2 endpoints
- Call the `get_hr_employees_ref` tool handler directly
- Assert the response string contains both endpoints' method, URL, and auth headers

**Test 3 — Dynamic tool registration:**
- Place 3 fixture files in a temp `src/data/` directory
- Call the registry's registration function
- Assert that exactly 4 tools are registered: 3 domain tools + `list_library`
- Assert no tool names from outside the fixture set appear

**Test 4 — Missing data graceful handling:**
- Call `list_library` with an empty `src/data/` (no `_index.json`)
- Assert the response is the "No API reference data found" message (not a crash)

## Acceptance criteria

- [ ] `npm test` runs all 4 tests and exits 0
- [ ] Tests run without network access (pure fixture-based)
- [ ] No test imports Playwright or makes HTTP requests
- [ ] `list_library` test passes with fixture index containing 2+ groups
- [ ] Domain tool test passes asserting method, URL, and auth headers are present in output
- [ ] Registration test confirms exact tool count matches fixture file count + 1 (for `list_library`)
- [ ] Missing data test confirms no crash — returns the expected fallback message

## Blocked by

- Issue 0004 (list_library tool + domain reference tools)
