import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs";
import path from "path";
import type { Index } from "./types.js";

export function buildListLibraryContent(dataDir: string): string {
  const indexPath = path.join(dataDir, "_index.json");

  if (!fs.existsSync(indexPath)) {
    return "No API reference data found. Run npm run fetch-docs first.";
  }

  const index: Index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));

  if (!index.groups || index.groups.length === 0) {
    return "No API reference data found. Run npm run fetch-docs first.";
  }

  const lines: string[] = ["Sprout.ph API Library — available tools:", ""];

  for (const group of index.groups) {
    lines.push(group.label);
    for (const section of group.sections) {
      lines.push(`  • ${section.toolName.padEnd(40)} — ${section.description}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function registerListLibrary(server: McpServer, dataDir: string): void {
  const description = "Returns a directory of all available Sprout.ph API reference tools. Call this first when you don't know which domain tool to use.";

  server.tool("list_library", description, {}, async () => ({
    content: [{ type: "text" as const, text: buildListLibraryContent(dataDir) }],
  }));

  server.prompt("list_library", description, () => ({
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text: buildListLibraryContent(dataDir) },
      },
    ],
  }));
}
