import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerListLibrary } from "./tools/list-library.js";
import { registerDomainTools } from "./tools/registry.js";
import path from "path";

const PORT = process.env.PORT ?? "3000";
export const DATA_DIR = path.join(process.cwd(), "src", "data");

async function main() {
  console.log("Sprout MCP server starting…");

  const server = new McpServer({
    name: "sprout-api",
    version: "1.0.0",
  });

  registerListLibrary(server, DATA_DIR);
  const count = registerDomainTools(server, DATA_DIR);
  console.log(`Registered ${count} domain tool(s) + list_library`);

  const app = express();
  app.use(express.json());

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  app.post("/mcp", async (req, res) => {
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("Error handling MCP request:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", (_req, res) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      })
    );
  });

  app.delete("/mcp", (_req, res) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      })
    );
  });

  app.listen(parseInt(PORT), () => {
    console.log(`Sprout MCP server listening on port ${PORT}`);
    console.log(`Connect at: http://localhost:${PORT}/mcp`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
