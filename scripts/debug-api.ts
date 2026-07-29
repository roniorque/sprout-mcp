/**
 * Debug script — dumps the raw Postman collection API response shape.
 * Run: npx tsx scripts/debug-api.ts
 */
import fs from "fs";

const COLLECTION_URL =
  "https://api-docs.sprout.ph/api/collections/43000909/2sBXcGEKi7" +
  "?environment=43000909-9559bdcc-997f-4d05-b255-fed642df5f61&segregateAuth=true&versionTag=latest";

const METADATA_URL = "https://api-docs.sprout.ph/view/metadata/2sBXcGEKi7";

async function probe(label: string, url: string) {
  console.log(`\n=== ${label} ===`);
  console.log(`URL: ${url}`);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "sprout-mcp-debug/1.0" },
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Content-Type: ${res.headers.get("content-type")}`);

    const text = await res.text();
    console.log(`Body length: ${text.length} bytes`);
    console.log(`Body preview (first 2000 chars):`);
    console.log(text.slice(0, 2000));

    // Try to parse as JSON and show top-level keys
    try {
      const json = JSON.parse(text);
      console.log(`\nTop-level keys: ${Object.keys(json).join(", ")}`);
      // Show structure one level deep
      for (const [k, v] of Object.entries(json)) {
        if (typeof v === "object" && v !== null) {
          console.log(`  ${k}: ${Array.isArray(v) ? `Array(${(v as unknown[]).length})` : `Object{${Object.keys(v as object).join(", ")}}`}`);
        } else {
          console.log(`  ${k}: ${v}`);
        }
      }
    } catch {
      console.log("(Not valid JSON)");
    }

    // Save full response
    fs.writeFileSync(`debug-response-${label.replace(/\s+/g, "-")}.txt`, text, "utf-8");
    console.log(`Full response saved to debug-response-${label.replace(/\s+/g, "-")}.txt`);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
  }
}

async function main() {
  await probe("collection-api", COLLECTION_URL);
  await probe("metadata-api", METADATA_URL);
}

main().catch(console.error);
