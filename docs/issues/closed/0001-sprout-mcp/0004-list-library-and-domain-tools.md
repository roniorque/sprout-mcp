# Issue 0004: list_library tool + domain reference tools

**Last updated:** Tuesday, Jul 29, 2026, 5:00 PM (UTC+8)

## What to build

Implement the two user-facing tool types that make the MCP server useful:

**`list_library` (`src/tools/list-library.ts`):**
- Reads `src/data/_index.json` at call time (not cached — always reflects current files)
- Returns a formatted response listing all domain groups and their sections with tool names and short descriptions
- Response shape allows the agent to immediately identify the correct domain tool to call next
- Return format (as readable text for the LLM):
  ```
  Sprout.ph API Library — available tools:

  HR
    • get_hr_employees_ref — HR Employees API reference
    • get_hr_leaves_ref    — HR Leaves API reference
    ...

  Payroll
    • get_payroll_runs_ref — Payroll Runs API reference
    ...
  ```

**Domain reference tool output format:**
Each `get_{group}_{section}_ref` tool returns a formatted string per endpoint:
```
[GET] https://api.sprout.ph/v2/hr/employees — Get Employee List
Auth: Authorization: Bearer {token} | Ocp-Apim-Subscription-Key: {key}
Params: page (query, integer, optional) — Page number
Response example: { "data": [], "meta": {} }
---
```

The output must be LLM-readable in a single response — no truncation, no pagination.

## Acceptance criteria

- [ ] `list_library` tool is registered and callable via the MCP server
- [ ] `list_library` response lists all groups and sections present in `src/data/_index.json`
- [ ] `list_library` response includes the exact tool name for each section so the agent can call it directly
- [ ] Each domain tool response includes HTTP method, full URL, auth headers, all parameters, and response example for every endpoint in the section
- [ ] Auth headers (`Authorization: Bearer {token}` and `Ocp-Apim-Subscription-Key: {key}`) appear in every endpoint entry that requires them
- [ ] Calling `list_library` when `_index.json` is missing returns a helpful message: "No API reference data found. Run npm run fetch-docs first."
- [ ] `list_library` output stays accurate after a re-scrape and server restart — no stale tool names

## Blocked by

- Issue 0003 (MCP SSE server + dynamic tool registry)
