import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs";
import path from "path";
import type { Index, SectionData, Endpoint } from "./types.js";

export function formatSectionContent(data: SectionData): string {
  const label = data.label ?? data.sectionLabel ?? data.section;
  const lines: string[] = [`${data.groupLabel ?? data.group} — ${label}`, ""];

  if (!data.endpoints || data.endpoints.length === 0) {
    return `${label}\n\nNo endpoints found in this section.`;
  }

  for (const ep of data.endpoints) {
    lines.push(formatEndpoint(ep));
    lines.push("---");
  }

  return lines.join("\n").trimEnd();
}

function formatEndpoint(ep: Endpoint): string {
  const parts: string[] = [];

  const method = ep.method ?? "?";
  const url = ep.url ?? "(URL not extracted)";
  parts.push(`[${method}] ${url}${ep.title ? ` — ${ep.title}` : ""}`);

  if (ep.description) {
    parts.push(ep.description);
  }

  if (ep.auth?.headers && ep.auth.headers.length > 0) {
    parts.push(`Auth: ${ep.auth.headers.join(" | ")}`);
  }

  if (ep.parameters && ep.parameters.length > 0) {
    for (const p of ep.parameters) {
      const req = p.required ? "required" : "optional";
      parts.push(`Param: ${p.name} (${p.in}, ${p.type}, ${req}) — ${p.description}`);
    }
  }

  if (ep.requestBody != null) {
    parts.push(`Request body: ${JSON.stringify(ep.requestBody, null, 2)}`);
  }

  if (ep.responseExample != null) {
    parts.push(`Response example: ${JSON.stringify(ep.responseExample, null, 2)}`);
  }

  return parts.join("\n");
}

export function registerDomainTools(server: McpServer, dataDir: string): number {
  const indexPath = path.join(dataDir, "_index.json");

  if (!fs.existsSync(indexPath)) {
    console.warn("⚠  No data files found — run npm run fetch-docs first");
    return 0;
  }

  const index: Index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  let count = 0;

  for (const group of index.groups) {
    for (const section of group.sections) {
      const filePath = path.join(dataDir, section.file);

      server.tool(
        section.toolName,
        section.description,
        {},
        async () => {
          const raw = fs.readFileSync(filePath, "utf-8");
          const data: SectionData = JSON.parse(raw);
          return {
            content: [{ type: "text" as const, text: formatSectionContent(data) }],
          };
        }
      );

      console.log(`  ✓ ${section.toolName}`);
      count++;
    }
  }

  return count;
}
