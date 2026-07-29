/**
 * Diagnostic script — dumps the rendered sidebar structure of the Sprout docs site.
 * Run: npm run diagnose
 * Output: diagnostic-output.txt + diagnostic-full.html
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT_URL = "https://api-docs.sprout.ph/";

async function main() {
  console.log(`Loading ${ROOT_URL}…`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(ROOT_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000); // extra settle time

  // ── 1. Save full HTML ────────────────────────────────────────────────────
  const fullHtml = await page.content();
  fs.writeFileSync("diagnostic-full.html", fullHtml, "utf-8");
  console.log(`Full HTML saved to diagnostic-full.html (${fullHtml.length} bytes)`);

  // ── 2. Inventory nav/sidebar elements ───────────────────────────────────
  const navInfo = await page.evaluate(() => {
    const info: string[] = [];

    // All nav-like elements with their classes/ids
    const navSelectors = ["nav", "aside", "[role='navigation']", "[class*='sidebar']",
      "[class*='nav']", "[class*='menu']", "[id*='sidebar']", "[id*='nav']"];

    for (const sel of navSelectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        info.push(`\n=== ${sel} (${els.length} found) ===`);
        els.forEach((el, i) => {
          const linkCount = el.querySelectorAll("a").length;
          info.push(`  [${i}] tag=${el.tagName.toLowerCase()} id="${el.id}" class="${el.className}" links=${linkCount}`);
        });
      }
    }

    // All anchor tags grouped by parent
    info.push(`\n=== All <a> tags (first 80) ===`);
    const links = Array.from(document.querySelectorAll("a[href]")).slice(0, 80);
    links.forEach(a => {
      const anchor = a as HTMLAnchorElement;
      info.push(`  href="${anchor.pathname}" text="${anchor.textContent?.trim().slice(0, 60)}" parent=${anchor.parentElement?.tagName}.${anchor.parentElement?.className?.slice(0, 40)}`);
    });

    // Top-level DOM structure
    info.push(`\n=== Body children (tag + class) ===`);
    Array.from(document.body.children).forEach(el => {
      info.push(`  <${el.tagName.toLowerCase()} id="${el.id}" class="${el.className?.slice(0, 80)}">`);
    });

    // Any expandable/accordion elements
    info.push(`\n=== Expandable elements ===`);
    ["[aria-expanded]", "details", "summary", "[data-state]", "[class*='accordion']",
      "[class*='collaps']", "[class*='expand']"].forEach(sel => {
      const count = document.querySelectorAll(sel).length;
      if (count > 0) info.push(`  ${sel}: ${count} found`);
    });

    return info.join("\n");
  });

  const output = `Sprout Docs Diagnostic\nURL: ${ROOT_URL}\n${navInfo}`;
  fs.writeFileSync("diagnostic-output.txt", output, "utf-8");
  console.log("\n" + output);
  console.log("\nDiagnostic complete. Files written:");
  console.log("  diagnostic-output.txt");
  console.log("  diagnostic-full.html");

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
