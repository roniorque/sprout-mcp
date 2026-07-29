# Sprout MCP

**Last updated:** Wednesday, Jul 30, 2026, 4:00 PM (UTC+8)

A read-only MCP server that gives AI agents structured access to the full Sprout.ph API reference without hitting the live docs site at runtime.

## Language

**Library**:
The complete set of MCP tools registered on this server — one `list_library` directory tool plus one domain tool per API section. An agent queries the library to find and call the right reference.
_Avoid_: registry, catalog, index (those refer to the internal `_index.json` manifest)

**Domain tool**:
A no-argument MCP tool that returns the full endpoint reference for one API section (method, URL, auth, parameters, response example). Named with a short prefix form such as `full_access_employee` or `dev_gateway_payroll` — kept under 50 characters so the combined server+tool name fits the 60-character limit enforced by MCP clients.
_Avoid_: endpoint tool, API tool

**Group**:
A top-level folder in the Postman collection (e.g. "Authorization Service", "Full-Access API", "Restricted Access API"). Maps to the level-1 sidebar in the Sprout docs. Becomes the `{group}` segment of a domain tool name.
_Avoid_: category, namespace

**Section**:
A sub-folder within a group in the Postman collection (e.g. "Employee Service", "Payroll Service"). One section = one domain tool = one JSON data file in `src/data/`. Becomes the `{section}` segment of a domain tool name.
_Avoid_: topic, page, resource

**Fetch**:
The act of pulling the Postman collection JSON from the Sprout docs API and writing all section data files plus `_index.json` to `src/data/`. Triggered manually via `npm run fetch-docs`.
_Avoid_: scrape (the implementation no longer uses a browser scraper)

**Index**:
The `src/data/_index.json` manifest written by `npm run fetch-docs`. Lists all groups and sections with their tool names and file paths. Used by the server at startup to register tools and build the `list_library` TOC.
_Avoid_: manifest, registry file
