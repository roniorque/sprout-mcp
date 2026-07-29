# Issue 0003: MCP SSE server + dynamic tool registry

**Last updated:** Tuesday, Jul 29, 2026, 5:00 PM (UTC+8)

## What to build

Build the MCP server core: an SSE transport layer and a dynamic tool registry that reads `src/data/` at startup and registers one MCP tool per discovered section file. This slice can proceed in parallel with Issue 0002 — use fixture data files in `src/data/` to develop and verify against.

**Server (`src/server.ts`):**
- Creates a `McpServer` instance using `@modelcontextprotocol/sdk`
- Uses `StreamableHTTPServerTransport` (not the deprecated `SSEServerTransport`)
- Listens on `process.env.PORT` (default `3000`)
- On startup: reads `src/data/_index.json`, registers all domain tools via the registry, registers `list_library`, then starts serving
- Logs each registered tool name to stdout on startup
- Ready to accept SSE connections within 5 seconds of starting

**Registry (`src/tools/registry.ts`):**
- Reads `src/data/_index.json` at call time
- For each section entry, registers a tool named `get_{group}_{section}_ref`
- Each tool takes no arguments
- Each tool handler reads its corresponding `src/data/{group}_{section}.json` and returns its content formatted as a readable string (method, URL, auth, parameters, examples)
- If `src/data/` is empty or `_index.json` is missing, the server starts with only `list_library` registered and logs a warning: "No data files found — run npm run fetch-docs first"

## Acceptance criteria

- [ ] `npm start` starts the server and logs the registered tool names
- [ ] Server binds to `process.env.PORT` when set; falls back to `3000`
- [ ] Server uses `StreamableHTTPServerTransport` (not the deprecated SSE transport)
- [ ] With fixture `src/data/` files present, domain tools are registered dynamically — no hardcoded tool names in the server code
- [ ] Calling a registered domain tool returns a non-empty string containing endpoint details
- [ ] Server starts in under 5 seconds on a standard developer machine
- [ ] Server logs a clear warning when `src/data/` is empty or `_index.json` is missing — does not crash
- [ ] Adding a new fixture file to `src/data/` and restarting the server causes the new tool to appear — no code change needed

## Blocked by

- Issue 0001 (project scaffold)
