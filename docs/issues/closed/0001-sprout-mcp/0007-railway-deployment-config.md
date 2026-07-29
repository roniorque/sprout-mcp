# Issue 0007: Railway deployment config

**Last updated:** Tuesday, Jul 29, 2026, 5:00 PM (UTC+8)

## What to build

Add the minimal configuration needed to deploy the MCP server to Railway with zero code changes. The server already reads `PORT` from the environment — this slice adds the deploy descriptor and documents the setup.

**Deliverables:**
- `railway.toml` with `startCommand = "node dist/server.js"` and `buildCommand = "npm install && npm run build && npm run fetch-docs"`
- `.env.example` documenting the `PORT` environment variable
- README section: "Deploy to Railway" with step-by-step instructions (connect repo, set env vars, deploy)

**Note on `src/data/` at deploy time:**
Because `src/data/` is in `.gitignore`, Railway must run `npm run fetch-docs` as part of the build step to populate the data files before the server starts. The `buildCommand` in `railway.toml` includes this.

## Acceptance criteria

- [ ] `railway.toml` is present with correct `buildCommand` and `startCommand`
- [ ] `buildCommand` includes `npm run fetch-docs` so data files are populated before server start
- [ ] `.env.example` lists `PORT` with a default comment
- [ ] README contains a "Deploy to Railway" section with instructions
- [ ] Server binds to `process.env.PORT` with no hardcoded fallback in production path
- [ ] No secrets or credentials are committed (`.env` is in `.gitignore`)

## Blocked by

- Issue 0003 (MCP SSE server + dynamic tool registry)
