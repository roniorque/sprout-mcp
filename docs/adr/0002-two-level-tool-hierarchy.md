# ADR 0002: Two-level MCP tool hierarchy (list_library + one tool per section)

**Status:** accepted
**Date:** Wednesday, Jul 30, 2026, 10:00 AM (UTC+8)
**Engagement:** `0001-sprout-mcp`

Rather than one tool per endpoint (hundreds of tools) or one tool for the entire API (one massive response), the library exposes a `list_library` directory tool plus one domain tool per Postman sub-folder (section). Each domain tool returns all endpoints for that section in a single call.

This matches how an agent actually navigates the API: it first needs orientation (which section covers employees? which covers payroll?), then needs the full detail for the relevant section in one shot. A single-tool design would send hundreds of endpoints to the agent regardless of what it needs. A per-endpoint design would require the agent to know the exact tool name before calling it and would generate hundreds of MCP tools, which inflates the tool list beyond what most clients render usefully.

The section boundary (Postman sub-folder) is the natural unit because it already represents a coherent API domain as Sprout organised it. Tool names (`get_{group}_{section}_ref`) are derived automatically from the collection structure at fetch time — no hardcoding.
