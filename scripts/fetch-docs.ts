/**
 * Fetches Sprout API docs from the Postman Documenter collection JSON API.
 * No browser/Playwright needed — the collection JSON is publicly available.
 * Run: npm run fetch-docs
 */
import fs from "fs";
import path from "path";

// Postman Documenter exposes the full collection via this API (found in <link rel="prefetch"> in the HTML)
const COLLECTION_URL =
  "https://api-docs.sprout.ph/api/collections/43000909/2sBXcGEKi7" +
  "?environment=43000909-9559bdcc-997f-4d05-b255-fed642df5f61&segregateAuth=true&versionTag=latest";

const DATA_DIR = path.join(process.cwd(), "src", "data");

// ── Postman collection types (v2.1 format, simplified) ───────────────────────

interface PmUrlQuery {
  key?: string;
  value?: string;
  description?: string | { content?: string };
  disabled?: boolean;
}

interface PmUrl {
  raw?: string;
  host?: string[];
  path?: string[];
  query?: PmUrlQuery[];
}

interface PmHeaderItem {
  key?: string;
  value?: string;
  description?: string | { content?: string };
  disabled?: boolean;
}

interface PmBodyParam {
  key?: string;
  value?: string;
  description?: string | { content?: string };
  disabled?: boolean;
}

interface PmBody {
  mode?: string;
  raw?: string;
  urlencoded?: PmBodyParam[];
  formdata?: PmBodyParam[];
}

interface PmRequest {
  method?: string;
  url?: string | PmUrl;
  header?: PmHeaderItem[];
  body?: PmBody;
  description?: string | { content?: string };
}

interface PmResponse {
  name?: string;
  body?: string;
  status?: string;
  code?: number;
}

interface PmItem {
  id?: string;
  name: string;
  description?: string | { content?: string };
  request?: PmRequest;
  response?: PmResponse[];
  item?: PmItem[];
}

interface PmCollection {
  info?: { name?: string };
  item?: PmItem[];
}

// ── Our output types (matching src/tools/types.ts) ───────────────────────────

interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  type?: string;
  description?: string;
}

interface Endpoint {
  method: string;
  url: string;
  title?: string;
  description?: string;
  auth?: { headers: string[] };
  parameters?: Parameter[];
  responseExample?: unknown;
}

interface SectionData {
  group: string;
  groupLabel: string;
  section: string;
  sectionLabel: string;
  label?: string;
  endpoints: Endpoint[];
}

interface SectionEntry {
  toolName: string;
  description: string;
  file: string;
}

interface GroupEntry {
  label: string;
  sections: SectionEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getText(val: string | { content?: string } | undefined): string {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  return (val.content ?? "").trim();
}

function getUrlString(url?: string | PmUrl): string {
  if (!url) return "";
  if (typeof url === "string") return url;
  if (url.raw) return url.raw;
  const host = (url.host ?? []).join(".");
  const pathParts = (url.path ?? []).join("/");
  return host ? `${host}/${pathParts}` : pathParts;
}

function extractParameters(req: PmRequest): Parameter[] {
  const params: Parameter[] = [];

  // Query string params
  if (typeof req.url === "object" && req.url?.query) {
    for (const q of req.url.query) {
      if (!q.key || q.disabled) continue;
      params.push({
        name: q.key,
        in: "query",
        description: getText(q.description as string | { content?: string }),
      });
    }
  }

  // URL-encoded or form-data body params
  const bodyParams = req.body?.urlencoded ?? req.body?.formdata ?? [];
  for (const p of bodyParams) {
    if (!p.key || p.disabled) continue;
    params.push({
      name: p.key,
      in: "body",
      description: getText(p.description as string | { content?: string }),
    });
  }

  // Non-auth headers worth exposing
  if (req.header) {
    for (const h of req.header) {
      if (!h.key || h.disabled) continue;
      const key = h.key.toLowerCase();
      if (key === "ocp-apim-subscription-key" || key === "content-type") continue;
      params.push({
        name: h.key,
        in: "header",
        description: getText(h.description as string | { content?: string }),
      });
    }
  }

  return params;
}

function itemToEndpoint(item: PmItem): Endpoint | null {
  if (!item.request) return null;
  const req = item.request;
  const urlStr = getUrlString(req.url);

  let responseExample: string | undefined;
  if (item.response && item.response.length > 0) {
    const resp = item.response[0];
    if (resp.body) {
      try {
        responseExample = JSON.stringify(JSON.parse(resp.body), null, 2).slice(0, 1000);
      } catch {
        responseExample = resp.body.slice(0, 1000);
      }
    }
  }

  const params = extractParameters(req);

  return {
    method: req.method?.toUpperCase() ?? "GET",
    url: urlStr,
    title: item.name,
    description: getText(req.description),
    auth: { headers: ["Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY"] },
    parameters: params.length > 0 ? params : undefined,
    responseExample,
  };
}

/** Recursively collect all endpoints from a list of items (handles nested folders). */
function collectEndpoints(items: PmItem[]): Endpoint[] {
  const endpoints: Endpoint[] = [];
  for (const item of items) {
    if (item.request) {
      const ep = itemToEndpoint(item);
      if (ep) endpoints.push(ep);
    }
    if (item.item && item.item.length > 0) {
      endpoints.push(...collectEndpoints(item.item));
    }
  }
  return endpoints;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Sprout MCP — fetching docs from Postman collection API…\n");

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // ── 1. Fetch collection JSON ───────────────────────────────────────────────
  console.log("Fetching collection JSON…");
  let data: PmCollection;
  try {
    const res = await fetch(COLLECTION_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "sprout-mcp-fetcher/1.0",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    data = (await res.json()) as PmCollection;
  } catch (err) {
    console.error(`✗ Failed to fetch collection: ${(err as Error).message}`);
    process.exit(1);
  }

  const topItems = data?.item;
  if (!topItems || topItems.length === 0) {
    console.error("✗ No items found in collection response. The API shape may have changed.");
    process.exit(1);
  }

  console.log(`✓ Collection fetched — ${topItems.length} top-level group(s)\n`);

  // ── 2. Build two-level hierarchy ──────────────────────────────────────────
  // Level 1 = top-level Postman folder (e.g. "Authorization Service", "Full-Access API")
  // Level 2 = sub-folder within L1 (one MCP tool per L2 entry)
  //           If L1 has no sub-folders, treat all its requests as one L2 section.

  const index: GroupEntry[] = [];
  let totalTools = 0;

  for (const group of topItems) {
    const groupSlug = slugify(group.name);
    const groupEntry: GroupEntry = { label: group.name, sections: [] };

    const children = group.item ?? [];

    // Separate sub-folders from direct requests
    const subFolders = children.filter((c) => c.item && c.item.length > 0);
    const directRequests = children.filter((c) => c.request);

    if (subFolders.length > 0) {
      // L2 = each sub-folder becomes one tool
      for (const sub of subFolders) {
        const subSlug = slugify(sub.name);
        const toolName = `get_${groupSlug}_${subSlug}_ref`;
        const file = `${groupSlug}_${subSlug}.json`;

        const endpoints = collectEndpoints(sub.item ?? []);
        // Also include any direct requests directly on the sub-folder item itself
        if (sub.request) {
          const ep = itemToEndpoint(sub);
          if (ep) endpoints.unshift(ep);
        }

        if (endpoints.length === 0) {
          console.warn(`  ⚠  ${toolName}: 0 endpoints, skipping`);
          continue;
        }

        const sectionData: SectionData = {
          group: groupSlug,
          groupLabel: group.name,
          section: subSlug,
          sectionLabel: sub.name,
          label: sub.name,
          endpoints,
        };
        fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(sectionData, null, 2), "utf-8");

        groupEntry.sections.push({
          toolName,
          description: `${group.name} — ${sub.name} API reference`,
          file,
        });
        totalTools++;
        console.log(`  ✓ ${toolName} (${endpoints.length} endpoint(s))`);
      }

      // If there are also loose direct requests at L1 level, bundle them as a "general" section
      if (directRequests.length > 0) {
        const subSlug = "general";
        const toolName = `get_${groupSlug}_${subSlug}_ref`;
        const file = `${groupSlug}_${subSlug}.json`;
        const endpoints = directRequests.map(itemToEndpoint).filter((e): e is Endpoint => e !== null);

        if (endpoints.length > 0) {
          const sectionData: SectionData = {
            group: groupSlug,
            groupLabel: group.name,
            section: "general",
            sectionLabel: "General",
            label: "General",
            endpoints,
          };
          fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(sectionData, null, 2), "utf-8");
          groupEntry.sections.push({
            toolName,
            description: `${group.name} — General API reference`,
            file,
          });
          totalTools++;
          console.log(`  ✓ ${toolName} (${endpoints.length} endpoint(s))`);
        }
      }
    } else {
      // No sub-folders — all requests in this group → single tool
      const endpoints = collectEndpoints(children);

      if (endpoints.length === 0) {
        console.warn(`  ⚠  group "${group.name}": 0 endpoints, skipping`);
        continue;
      }

      const sectionSlug = groupSlug;
      const toolName = `get_${groupSlug}_${sectionSlug}_ref`;
      const file = `${groupSlug}_${sectionSlug}.json`;

      const sectionData: SectionData = {
        group: groupSlug,
        groupLabel: group.name,
        section: sectionSlug,
        sectionLabel: group.name,
        label: group.name,
        endpoints,
      };
      fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(sectionData, null, 2), "utf-8");
      groupEntry.sections.push({
        toolName,
        description: `${group.name} API reference`,
        file,
      });
      totalTools++;
      console.log(`  ✓ ${toolName} (${endpoints.length} endpoint(s))`);
    }

    if (groupEntry.sections.length > 0) {
      index.push(groupEntry);
    }
  }

  // ── 3. Write _index.json ───────────────────────────────────────────────────
  fs.writeFileSync(
    path.join(DATA_DIR, "_index.json"),
    JSON.stringify({ groups: index }, null, 2),
    "utf-8"
  );

  console.log(`\n✓ Done. ${totalTools} tools across ${index.length} group(s).`);
  console.log(`  Data written to: ${DATA_DIR}`);
  console.log("\nRun npm run dev (or npm start) to launch the MCP server.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
