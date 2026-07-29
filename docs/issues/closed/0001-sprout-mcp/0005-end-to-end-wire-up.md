# Issue 0005: End-to-end wire-up

**Last updated:** Tuesday, Jul 29, 2026, 5:00 PM (UTC+8)

## What to build

Run the real Playwright scraper against the live Sprout docs, connect the real MCP server to a Claude client, and verify the full flow works end-to-end. This is the integration slice that confirms all prior slices work together with real data.

**Steps:**
1. Run `npm run fetch-docs` against `https://api-docs.sprout.ph/` — scrape real docs into `src/data/`
2. Verify the validation report shows zero mismatches
3. Start the MCP server (`npm start`)
4. Connect Claude Desktop (or Claude Code) to the SSE endpoint via `claude_desktop_config.json` or `.claude/settings.json`
5. Call `list_library` from a Claude session — confirm the TOC lists real Sprout API sections
6. Call at least one domain tool (e.g. `get_hr_employees_ref`) — confirm it returns real endpoint data with correct method, URL, and auth headers
7. Verify that the open question from the idea doc is resolved: document whether the sidebar has more than 2 levels of nesting (and update the issue notes if a level-3 split is needed)

**Claude client config (SSE):**
```json
{
  "mcpServers": {
    "sprout-api": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

Any bugs found during this slice are filed as new issues and routed through the bug-fix phase.

## Acceptance criteria

- [ ] `npm run fetch-docs` exits 0 with zero page-count mismatches in the validation report
- [ ] `src/data/` contains at least 3 section JSON files after the scrape
- [ ] `npm start` registers all scraped tools and logs their names on startup
- [ ] `list_library` called from Claude returns a TOC with real Sprout API section names
- [ ] At least one domain tool called from Claude returns real endpoint data (correct method, URL, auth headers)
- [ ] Sidebar nesting depth is documented (update issue notes — is level-2 sufficient or does level-3 splitting need a follow-up?)
- [ ] README.md contains setup instructions: `npm install`, `npm run fetch-docs`, `npm start`, client config snippet

## Blocked by

- Issue 0002 (Playwright scraper)
- Issue 0004 (list_library tool + domain reference tools)
