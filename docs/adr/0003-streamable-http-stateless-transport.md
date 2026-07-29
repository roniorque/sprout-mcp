# ADR 0003: StreamableHTTPServerTransport with no session ID (stateless)

**Status:** accepted
**Date:** Wednesday, Jul 30, 2026, 10:00 AM (UTC+8)
**Engagement:** `0001-sprout-mcp`

The MCP SDK ships two server transports: the deprecated `SSEServerTransport` (one persistent SSE connection per client, stateful) and `StreamableHTTPServerTransport` (POST-based, optionally stateful via session IDs). We use `StreamableHTTPServerTransport` with `sessionIdGenerator: undefined`, making it fully stateless — each POST to `/mcp` is independent.

The server is read-only; there is no per-session state to maintain. Stateless transport simplifies horizontal scaling (no sticky sessions needed) and Railway deployment (any replica can serve any request). The deprecated SSE transport was rejected because the SDK marks it for removal and it requires a persistent connection per client, which is unnecessary overhead for a reference-only server.
