# Issue 0001: Project scaffold

**Last updated:** Tuesday, Jul 29, 2026, 5:00 PM (UTC+8)

## What to build

Initialize the Node.js + TypeScript project structure for the Sprout MCP server. This slice produces a working repo skeleton with all tooling configured so every subsequent slice has a clean foundation to build on.

Deliverables:
- `package.json` with scripts: `build`, `start`, `fetch-docs`, `test`, `dev`
- `tsconfig.json` targeting Node 20, ES modules, strict mode
- `.gitignore` that excludes `dist/`, `node_modules/`, and `src/data/`
- Empty directory stubs: `src/tools/`, `src/data/`, `scripts/`, `tests/`
- Dependencies installed: `@modelcontextprotocol/sdk`, `express`, `typescript`, `tsx`, `vitest`
- Dev dependencies: `playwright`, `@types/node`, `@types/express`
- A minimal `src/server.ts` that imports the MCP SDK and prints "Sprout MCP server starting…" — enough to confirm the build pipeline works
- `npm run build` exits 0 and produces `dist/`

## Acceptance criteria

- [ ] `npm install` completes without errors
- [ ] `npm run build` compiles TypeScript and exits 0
- [ ] `npm start` runs `dist/server.js` and prints the startup message
- [ ] `src/data/` is listed in `.gitignore`
- [ ] `dist/` is listed in `.gitignore`
- [ ] `vitest` is importable (running `npx vitest --version` exits 0)
- [ ] Directory structure matches the layout in the PRD

## Blocked by

None — can start immediately.
