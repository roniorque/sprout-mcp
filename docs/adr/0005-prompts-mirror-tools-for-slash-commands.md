# ADR 0005: MCP prompts registered alongside every tool for slash command support

**Status:** accepted
**Date:** Wednesday, Jul 30, 2026, 4:00 PM (UTC+8)
**Engagement:** `0001-sprout-mcp`

Claude Code and Cursor expose MCP **prompts** as slash commands (`/mcp__<server>__<name>`) but MCP **tools** are only invokable via natural language. To give developers direct slash command access to every reference tool, we register a prompt with the same name and description as each tool. The prompt returns the same content as the tool but wrapped in a `messages` array (the MCP prompt response shape). This doubles the registered entry count (10 tools + 10 prompts) but adds no complexity — both are generated from the same `_index.json` loop.
