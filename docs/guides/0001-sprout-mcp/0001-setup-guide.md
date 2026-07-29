# Guide 0001: Sprout MCP Server — Setup & Usage

**Last updated:** Tuesday, Jul 29, 2026, 6:30 PM (UTC+8)

## First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright Chromium (one-time)
npx playwright install chromium

# 3. Scrape the Sprout API docs
npm run fetch-docs

# 4. Start the server
npm start
```

## Connect to Claude

Add to `.claude/settings.json` (Claude Code) or `claude_desktop_config.json` (Claude Desktop):

```json
{
  "mcpServers": {
    "sprout-api": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## Using the tools

**When you don't know which tool to call:**
```
list_library
```
Returns the full directory of available domain tools.

**When you know the domain:**
```
get_hr_employees_ref
get_hr_leaves_ref
get_payroll_runs_ref
... (etc — see list_library output)
```
Each tool returns all endpoints for that section with method, URL, auth headers, parameters, and response examples.

## Refreshing the docs

When Sprout updates their API:

```bash
npm run fetch-docs   # re-scrape — overwrites src/data/
npm start            # restart to pick up new files
```

No code changes needed. New sidebar sections are picked up automatically.

## Custom port

```bash
PORT=4000 npm start
```

Update your Claude client config to match.

## Development

```bash
npm run dev          # tsx hot-reload
npm test             # vitest (fixture-based, no network)
npm run test:watch   # watch mode
npm run build        # compile to dist/
```

## Troubleshooting

**`npm run fetch-docs` exits with "No sections found"**
The Sprout docs site may have changed its HTML structure. The scraper uses multiple fallback strategies for the sidebar, but a major redesign may require updating the selector logic in `scripts/fetch-docs.ts`.

**Server starts but no domain tools are registered**
`src/data/` is empty or `_index.json` is missing — run `npm run fetch-docs` first.

**Port already in use**
Set `PORT` to a free port in your `.env` file or as an environment variable.
