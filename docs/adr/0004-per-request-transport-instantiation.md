# ADR 0004: New transport instance per request (stateless SDK constraint)

**Status:** accepted
**Date:** Wednesday, Jul 30, 2026, 4:00 PM (UTC+8)
**Engagement:** `0001-sprout-mcp`

`StreamableHTTPServerTransport` with `sessionIdGenerator: undefined` (stateless mode) cannot be reused across requests — the SDK throws on the second call. A new `StreamableHTTPServerTransport` and a new `McpServer` must be created inside each request handler. This is not documented prominently; the constraint is enforced at runtime with the message "Stateless transport cannot be reused across requests." The per-request cost is acceptable for a read-only reference server with no shared state.
