import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";

const ROOT_URL = "https://api-docs.sprout.ph/";
const OUTPUT_DIR = path.join(process.cwd(), "src", "data");

// ── Slug helpers ─────────────────────────────────────────────────────────────

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toToolName(group: string, section: string): string {
  return `get_${toSlug(group)}_${toSlug(section)}_ref`;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface NavSection {
  groupLabel: string;
  sectionLabel: string;
  pages: { title: string; url: string }[];
}

interface Endpoint {
  title: string;
  method?: string;
  url?: string;
  auth?: { headers: string[] };
  description?: string;
  parameters?: { name: string; in: string; type: string; required: boolean; description: string }[];
  requestBody?: unknown;
  responseExample?: unknown;
  rawContent?: string;
}

// ── Sidebar extraction ────────────────────────────────────────────────────────

async function extractSidebar(page: Page): Promise<NavSection[]> {
  // Expand all collapsible sections first
  await expandAllSections(page);

  // Try to extract structured nav from common sidebar patterns
  const sections = await page.evaluate(() => {
    const results: { groupLabel: string; sectionLabel: string; href: string; title: string }[] = [];

    // Strategy 1: Look for nav with nested structure (most doc platforms)
    const navElements = Array.from(
      document.querySelectorAll("nav, [role='navigation'], .sidebar, #sidebar, aside")
    );

    let bestNav: Element | null = null;
    let bestLinkCount = 0;

    for (const nav of navElements) {
      const linkCount = nav.querySelectorAll("a[href]").length;
      if (linkCount > bestLinkCount) {
        bestLinkCount = linkCount;
        bestNav = nav;
      }
    }

    if (bestNav) {
      // Walk the nav tree: h2/h3/strong/span as group headers, links as pages
      const walker = document.createTreeWalker(
        bestNav,
        NodeFilter.SHOW_ELEMENT,
        null
      );

      let currentGroup = "General";
      let currentSection = "General";
      let node: Node | null;

      while ((node = walker.nextNode())) {
        const el = node as Element;
        const tag = el.tagName.toLowerCase();

        // Detect group/section headers
        if (["h1", "h2", "h3", "h4"].includes(tag)) {
          const text = el.textContent?.trim();
          if (text && text.length < 60) {
            currentGroup = text;
            currentSection = text;
          }
          continue;
        }

        // Detect links that look like doc pages
        if (tag === "a") {
          const anchor = el as HTMLAnchorElement;
          const href = anchor.href;
          const title = anchor.textContent?.trim() ?? "";

          if (!href || !title || href.startsWith("mailto:") || href.startsWith("javascript:")) {
            continue;
          }

          // Skip anchors that are just the same page
          const url = new URL(href);
          if (url.pathname === "/" || url.pathname === "") continue;

          // Try to find a parent heading to use as section
          let sectionLabel = currentSection;
          let parent = el.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const heading = parent.querySelector("h1, h2, h3, h4, strong, .group-title, .nav-group-title");
            if (heading && heading !== el) {
              const headingText = heading.textContent?.trim();
              if (headingText && headingText.length < 60 && headingText !== title) {
                sectionLabel = headingText;
                break;
              }
            }
            parent = parent.parentElement;
          }

          results.push({
            groupLabel: sectionLabel,
            sectionLabel: title,
            href,
            title,
          });
        }
      }
    }

    // Strategy 2: fallback — collect all internal links if strategy 1 found nothing
    if (results.length === 0) {
      const allLinks = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];
      const seen = new Set<string>();
      for (const a of allLinks) {
        const href = a.href;
        const title = a.textContent?.trim() ?? "";
        if (!href || !title || seen.has(href)) continue;
        if (a.href.includes(window.location.hostname)) {
          seen.add(href);
          results.push({ groupLabel: "General", sectionLabel: title, href, title });
        }
      }
    }

    return results;
  });

  if (sections.length === 0) {
    console.warn("⚠  No navigation links found. The site may require login or have an unusual structure.");
    return [];
  }

  // Group by groupLabel, then create sections
  // Heuristic: if a link's "sectionLabel" is the same as its "groupLabel", it's likely
  // a direct page link under the group, not a sub-section
  const groupMap = new Map<string, Map<string, { title: string; url: string }[]>>();

  for (const item of sections) {
    const groupKey = item.groupLabel;
    if (!groupMap.has(groupKey)) groupMap.set(groupKey, new Map());

    const sectionMap = groupMap.get(groupKey)!;
    // Use the groupLabel as the section if we can't determine a better one
    const sectionKey = item.sectionLabel === item.groupLabel ? item.groupLabel : item.sectionLabel;

    // Deduplicate by URL
    const existingPages = sectionMap.get(sectionKey) ?? [];
    const alreadyAdded = existingPages.some((p) => p.url === item.href);
    if (!alreadyAdded) {
      existingPages.push({ title: item.title, url: item.href });
      sectionMap.set(sectionKey, existingPages);
    }
  }

  // Convert to flat NavSection array
  // Re-group: use URL path structure to determine group/section
  return regroupByUrlPath(sections);
}

function regroupByUrlPath(
  items: { groupLabel: string; sectionLabel: string; href: string; title: string }[]
): NavSection[] {
  // Group URLs by their path structure:
  // /group/section/page OR /group/page
  const groupMap = new Map<string, Map<string, { title: string; url: string }[]>>();
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);

    let url: URL;
    try {
      url = new URL(item.href);
    } catch {
      continue;
    }

    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);

    let groupLabel: string;
    let sectionLabel: string;

    if (parts.length === 0) continue;
    if (parts.length === 1) {
      groupLabel = item.groupLabel || "General";
      sectionLabel = item.groupLabel || "General";
    } else if (parts.length === 2) {
      groupLabel = toTitleCase(parts[0]);
      sectionLabel = toTitleCase(parts[0]);
    } else {
      groupLabel = toTitleCase(parts[0]);
      sectionLabel = toTitleCase(parts[1]);
    }

    if (!groupMap.has(groupLabel)) groupMap.set(groupLabel, new Map());
    const sectionMap = groupMap.get(groupLabel)!;
    if (!sectionMap.has(sectionLabel)) sectionMap.set(sectionLabel, []);
    sectionMap.get(sectionLabel)!.push({ title: item.title, url: item.href });
  }

  const result: NavSection[] = [];
  for (const [groupLabel, sectionMap] of groupMap) {
    for (const [sectionLabel, pages] of sectionMap) {
      if (pages.length > 0) {
        result.push({ groupLabel, sectionLabel, pages });
      }
    }
  }

  return result;
}

function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function expandAllSections(page: Page): Promise<void> {
  // Click any expandable/collapsible toggle buttons in the sidebar
  const expandSelectors = [
    "button[aria-expanded='false']",
    "[data-state='closed']",
    ".accordion-trigger:not([data-state='open'])",
    ".nav-group-toggle",
    ".sidebar-toggle",
  ];

  for (const selector of expandSelectors) {
    try {
      const buttons = await page.$$(selector);
      for (const btn of buttons) {
        try {
          await btn.click({ timeout: 500 });
          await page.waitForTimeout(200);
        } catch {
          // ignore individual click failures
        }
      }
    } catch {
      // ignore selector errors
    }
  }

  await page.waitForLoadState("networkidle").catch(() => {});
}

// ── Page content extraction ───────────────────────────────────────────────────

async function extractPageContent(page: Page, url: string): Promise<Endpoint[]> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);

  const pageData = await page.evaluate(() => {
    // Get main content area
    const mainEl =
      document.querySelector("main") ??
      document.querySelector("article") ??
      document.querySelector(".content") ??
      document.querySelector(".doc-content") ??
      document.querySelector("#content") ??
      document.body;

    const rawText = mainEl.innerText ?? mainEl.textContent ?? "";
    const title = document.querySelector("h1")?.textContent?.trim() ?? document.title;

    // Extract code blocks
    const codeBlocks = Array.from(document.querySelectorAll("pre, code")).map(
      (el) => el.textContent?.trim() ?? ""
    ).filter(Boolean);

    // Extract tables (for parameters)
    const tables: { headers: string[]; rows: string[][] }[] = [];
    for (const table of document.querySelectorAll("table")) {
      const headers = Array.from(table.querySelectorAll("th")).map(
        (th) => th.textContent?.trim() ?? ""
      );
      const rows = Array.from(table.querySelectorAll("tr")).slice(1).map((tr) =>
        Array.from(tr.querySelectorAll("td")).map((td) => td.textContent?.trim() ?? "")
      );
      if (headers.length > 0 || rows.length > 0) {
        tables.push({ headers, rows });
      }
    }

    return { rawText, title, codeBlocks, tables };
  });

  // Parse endpoints from the raw text
  return parseEndpoints(pageData.rawText, pageData.title, pageData.codeBlocks, pageData.tables);
}

function parseEndpoints(
  rawText: string,
  title: string,
  codeBlocks: string[],
  tables: { headers: string[]; rows: string[][] }[]
): Endpoint[] {
  const AUTH_HEADERS = [
    "Authorization: Bearer {token}",
    "Ocp-Apim-Subscription-Key: {subscription_key}",
  ];

  // Find METHOD + URL patterns in the raw text
  const METHOD_URL_PATTERN = /\b(GET|POST|PUT|PATCH|DELETE)\b\s+(https?:\/\/[^\s\n]+|\/[^\s\n]+)/gi;
  const matches: { method: string; url: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = METHOD_URL_PATTERN.exec(rawText)) !== null) {
    matches.push({ method: m[1].toUpperCase(), url: m[2].trim() });
  }

  // Also check code blocks for URL patterns
  for (const block of codeBlocks) {
    const blockPattern = /\b(GET|POST|PUT|PATCH|DELETE)\b\s+(https?:\/\/[^\s\n"']+|\/[^\s\n"']+)/gi;
    while ((m = blockPattern.exec(block)) !== null) {
      const candidate = { method: m[1].toUpperCase(), url: m[2].trim() };
      if (!matches.some((e) => e.method === candidate.method && e.url === candidate.url)) {
        matches.push(candidate);
      }
    }
  }

  // Parse parameters from tables
  const parameters: Endpoint["parameters"] = [];
  for (const table of tables) {
    const nameIdx = table.headers.findIndex((h) => /name|param|field/i.test(h));
    const typeIdx = table.headers.findIndex((h) => /type/i.test(h));
    const reqIdx = table.headers.findIndex((h) => /required|req/i.test(h));
    const descIdx = table.headers.findIndex((h) => /desc|description/i.test(h));
    const inIdx = table.headers.findIndex((h) => /\bin\b|location|source/i.test(h));

    if (nameIdx === -1) continue;

    for (const row of table.rows) {
      if (row.length === 0 || !row[nameIdx]) continue;
      parameters.push({
        name: row[nameIdx] ?? "",
        type: typeIdx >= 0 ? (row[typeIdx] ?? "string") : "string",
        required: reqIdx >= 0 ? /yes|true|required/i.test(row[reqIdx] ?? "") : false,
        description: descIdx >= 0 ? (row[descIdx] ?? "") : "",
        in: inIdx >= 0 ? (row[inIdx] ?? "query") : "query",
      });
    }
  }

  // Find JSON examples in code blocks
  const jsonExamples = codeBlocks
    .filter((b) => b.startsWith("{") || b.startsWith("["))
    .map((b) => {
      try {
        return JSON.parse(b);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // Determine if auth headers are mentioned in the text
  const hasAuth =
    /bearer|token|Ocp-Apim|subscription.key|api.key/i.test(rawText) ||
    /Authorization/i.test(rawText);

  if (matches.length > 0) {
    return matches.map((match, i) => ({
      title,
      method: match.method,
      url: match.url,
      auth: hasAuth ? { headers: AUTH_HEADERS } : undefined,
      parameters: parameters.length > 0 ? parameters : undefined,
      requestBody: jsonExamples[0] ?? null,
      responseExample: jsonExamples[1] ?? jsonExamples[0] ?? null,
    }));
  }

  // Fallback: no structured extraction possible — store raw content
  return [
    {
      title,
      rawContent: rawText.slice(0, 8000),
      auth: hasAuth ? { headers: AUTH_HEADERS } : undefined,
      parameters: parameters.length > 0 ? parameters : undefined,
    },
  ];
}

// ── Main scrape loop ──────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSprout MCP — fetching docs from ${ROOT_URL}\n`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Load the root page
  console.log("Loading docs site…");
  await page.goto(ROOT_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Extract sidebar
  console.log("Extracting sidebar navigation…");
  const navSections = await extractSidebar(page);

  if (navSections.length === 0) {
    console.error("✗ No sections found in the sidebar. Cannot continue.");
    await browser.close();
    process.exit(1);
  }

  console.log(`Found ${navSections.length} section(s):\n`);
  for (const s of navSections) {
    console.log(`  [${s.groupLabel}] ${s.sectionLabel} — ${s.pages.length} page(s)`);
  }
  console.log("");

  // Track totals for validation
  let totalSidebarLinks = 0;
  let totalScraped = 0;
  let mismatch = false;

  const indexGroups: {
    label: string;
    sections: { file: string; toolName: string; description: string }[];
  }[] = [];

  const groupMap = new Map<string, typeof indexGroups[0]>();

  // Scrape each section
  for (const navSection of navSections) {
    const { groupLabel, sectionLabel, pages } = navSection;
    totalSidebarLinks += pages.length;

    console.log(`Scraping [${groupLabel}] ${sectionLabel}…`);

    const endpoints: Endpoint[] = [];
    let scraped = 0;

    for (const pageLink of pages) {
      try {
        console.log(`  → ${pageLink.title} (${pageLink.url})`);
        const pageEndpoints = await extractPageContent(page, pageLink.url);
        endpoints.push(...pageEndpoints);
        scraped++;
      } catch (err) {
        console.error(`  ✗ Failed: ${pageLink.url} — ${(err as Error).message}`);
      }
    }

    totalScraped += scraped;

    if (scraped !== pages.length) {
      console.warn(`  ⚠  Expected ${pages.length} pages, scraped ${scraped}`);
      mismatch = true;
    }

    // Write section data file
    const groupSlug = toSlug(groupLabel);
    const sectionSlug = toSlug(sectionLabel);
    const fileName = `${groupSlug}_${sectionSlug}.json`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    const sectionData = {
      group: groupSlug,
      groupLabel,
      section: sectionSlug,
      sectionLabel,
      label: sectionLabel,
      endpoints,
    };

    fs.writeFileSync(filePath, JSON.stringify(sectionData, null, 2), "utf-8");
    console.log(`  ✓ Written: ${fileName} (${endpoints.length} endpoint(s))`);

    // Add to index
    if (!groupMap.has(groupLabel)) {
      const group = { label: groupLabel, sections: [] as typeof indexGroups[0]["sections"] };
      groupMap.set(groupLabel, group);
      indexGroups.push(group);
    }

    groupMap.get(groupLabel)!.sections.push({
      file: fileName,
      toolName: toToolName(groupLabel, sectionLabel),
      description: `${groupLabel} ${sectionLabel} API reference`,
    });
  }

  // Write _index.json
  const indexPath = path.join(OUTPUT_DIR, "_index.json");
  fs.writeFileSync(indexPath, JSON.stringify({ groups: indexGroups }, null, 2), "utf-8");
  console.log(`\n✓ Written: _index.json\n`);

  await browser.close();

  // Validation report
  console.log("─── Validation Report ───────────────────────────────");
  console.log(`Sidebar links : ${totalSidebarLinks}`);
  console.log(`Pages scraped : ${totalScraped}`);
  console.log(`Status        : ${mismatch ? "⚠  MISMATCH" : "✓ OK"}`);
  console.log("─────────────────────────────────────────────────────\n");

  if (mismatch) {
    console.error("✗ Page count mismatch — some pages were not scraped.");
    process.exit(1);
  }

  console.log("Done. Run npm start to launch the MCP server.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
