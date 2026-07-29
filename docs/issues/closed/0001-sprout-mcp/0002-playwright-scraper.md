# Issue 0002: Playwright scraper

**Last updated:** Tuesday, Jul 29, 2026, 5:00 PM (UTC+8)

## What to build

Build `scripts/fetch-docs.ts` — a Playwright-based scraper that fully automates discovery and extraction of the Sprout.ph API docs. Running `npm run fetch-docs` should populate `src/data/` with one JSON file per level-2 sidebar section plus a `_index.json` manifest, with no manual configuration required.

**Scraper flow:**
1. Launch headless Chromium via Playwright
2. Navigate to `https://api-docs.sprout.ph/` and wait for network idle
3. Expand all collapsible sidebar sections (click every expand toggle; wait for DOM stability after each)
4. Extract the sidebar link tree: level-1 items become group labels; level-2 items become section names with their child page URLs
5. For each level-2 section, visit every child page (wait for network idle), then extract:
   - Endpoint HTTP method + full URL
   - Description
   - Required auth headers (Bearer token, Ocp-Apim-Subscription-Key)
   - Path and query parameters (name, type, required flag, description)
   - Request body schema + example payload
   - Response schema + example payload
6. Write `src/data/{group}_{section}.json` per section (overwrite on re-run)
7. Write `src/data/_index.json` containing TOC metadata for every section
8. Print a validation report: section name → pages scraped, total scraped vs total sidebar links
9. Exit with code 1 if any page count does not match the sidebar count

**Data file shape** (from PRD):
```jsonc
{
  "group": "hr",
  "section": "employees",
  "label": "Employees",
  "endpoints": [
    {
      "title": "Get Employee List",
      "method": "GET",
      "url": "https://api.sprout.ph/v2/hr/employees",
      "auth": { "headers": ["Authorization: Bearer {token}", "Ocp-Apim-Subscription-Key: {key}"] },
      "parameters": [{ "name": "page", "in": "query", "type": "integer", "required": false, "description": "Page number" }],
      "requestBody": null,
      "responseExample": { "data": [], "meta": {} }
    }
  ]
}
```

**`_index.json` shape:**
```jsonc
{
  "groups": [
    {
      "label": "HR",
      "sections": [
        { "file": "hr_employees.json", "toolName": "get_hr_employees_ref", "description": "HR Employees API reference" }
      ]
    }
  ]
}
```

## Acceptance criteria

- [ ] `npm run fetch-docs` completes without errors against the live Sprout docs site
- [ ] At least one `src/data/{group}_{section}.json` file is written per discovered level-2 sidebar section
- [ ] `src/data/_index.json` is written with the correct group/section/toolName mapping
- [ ] Each data file contains an `endpoints` array with at least one entry per page scraped
- [ ] Each endpoint entry includes `method`, `url`, and `auth.headers`
- [ ] The validation report is printed to stdout after the scrape completes
- [ ] Scraper exits 0 when all page counts match; exits 1 when a mismatch is detected
- [ ] Re-running `npm run fetch-docs` fully overwrites existing data files (no stale data)
- [ ] No section assignment requires manual configuration — all grouping is derived from the sidebar

## Blocked by

- Issue 0001 (project scaffold)
