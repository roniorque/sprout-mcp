# Guide 0001: Sprout MCP Server — Setup & Usage

**Last updated:** Wednesday, Jul 30, 2026, 10:00 AM (UTC+8)

## First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Configure port (create .env in project root)
echo PORT=3456 > .env

# 3. Fetch the Sprout API docs
npm run fetch-docs

# 4. Start the server
npm run dev        # development
npm start          # production (requires npm run build first)
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

Set `PORT` in your `.env` file:

```env
PORT=3456
```

Or pass inline: `PORT=4000 npm start`. Update your Claude client config URL to match.

## Development

```bash
npm run dev          # tsx hot-reload
npm test             # vitest (fixture-based, no network)
npm run test:watch   # watch mode
npm run build        # compile to dist/
```

## Troubleshooting

**`npm run fetch-docs` fails with HTTP error or "No items found"**
The Sprout docs Postman collection API URL may have changed. Check the `<link rel="prefetch">` in the page source of `https://api-docs.sprout.ph/` for the current collection endpoint and update `COLLECTION_URL` in `scripts/fetch-docs.ts`. Run `npx tsx scripts/debug-api.ts` to inspect the live API response shape.

**Server starts but no domain tools are registered**
`src/data/` is empty or `_index.json` is missing — run `npm run fetch-docs` first.

**Port already in use**
Set `PORT` to a free port in your `.env` file or as an environment variable.
