import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerListLibrary } from "./tools/list-library.js";
import { registerDomainTools } from "./tools/registry.js";
import path from "path";

const PORT = process.env.PORT ?? "3000";
export const DATA_DIR = path.join(process.cwd(), "src", "data");

function createMcpServer(): McpServer {
  const server = new McpServer({ name: "sprout-api", version: "1.0.0" });
  registerListLibrary(server, DATA_DIR);
  registerDomainTools(server, DATA_DIR);
  return server;
}

async function main() {
  console.log("Sprout MCP server starting…");

  // Log tool count once
  const probe = new McpServer({ name: "probe", version: "1.0.0" });
  registerListLibrary(probe, DATA_DIR);
  const count = registerDomainTools(probe, DATA_DIR);
  console.log(`Registered ${count} domain tool(s) + list_library`);

  const app = express();
  app.use(express.json());

  // Tell Claude Code this server needs no OAuth
  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json({ authorization_servers: [] });
  });

  // Stateless mode: create a new transport + server per request
  const handleMcp = async (req: express.Request, res: express.Response) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await createMcpServer().connect(transport);
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
  };

  app.post("/mcp", handleMcp);
  app.get("/mcp", handleMcp);
  app.delete("/mcp", handleMcp);

  app.listen(parseInt(PORT), () => {
    console.log(`Sprout MCP server listening on port ${PORT}`);
    console.log(`Connect at: http://localhost:${PORT}/mcp`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
