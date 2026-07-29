# ADR 0001: Postman collection JSON API instead of Playwright DOM scraping

**Status:** accepted
**Date:** Wednesday, Jul 30, 2026, 10:00 AM (UTC+8)
**Engagement:** `0001-sprout-mcp`

The Sprout docs site (`https://api-docs.sprout.ph/`) is a Postman Documenter page. The page's `<head>` contains a `<link rel="prefetch">` pointing to a public JSON endpoint that returns the entire Postman collection — all folders, requests, parameters, and response examples — in a single HTTP response (~2.9 MB). We use `fetch()` against this endpoint directly instead of launching a headless Chromium browser to scrape the rendered DOM.

The original plan assumed a generic JS-rendered SPA requiring Playwright. The Postman Documenter structure was only discovered by running the diagnostic script against the live page. Switching to the JSON API eliminates the browser dependency entirely, makes `npm run fetch-docs` run in seconds instead of minutes, and produces richer structured data than DOM extraction would yield (parameters, response examples, and auth config are all first-class fields in the collection JSON).

**Considered options rejected:**
- Playwright DOM scraping — fragile (selector-dependent), slow, required `npx playwright install chromium`; abandoned after diagnostic confirmed the collection JSON API was available
- Static OpenAPI spec — no public spec URL found (all common paths returned 404)
