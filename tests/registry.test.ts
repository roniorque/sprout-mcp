import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { formatSectionContent, registerDomainTools } from "../src/tools/registry.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

let tempDir: string;

const FIXTURE_SECTION = {
  group: "hr",
  groupLabel: "HR",
  section: "employees",
  sectionLabel: "Employees",
  label: "Employees",
  endpoints: [
    {
      title: "Get Employee List",
      method: "GET",
      url: "https://api.sprout.ph/v2/hr/employees",
      auth: {
        headers: [
          "Authorization: Bearer {token}",
          "Ocp-Apim-Subscription-Key: {key}",
        ],
      },
      parameters: [
        { name: "page", in: "query", type: "integer", required: false, description: "Page number" },
      ],
      responseExample: { data: [], meta: {} },
    },
    {
      title: "Get Employee By ID",
      method: "GET",
      url: "https://api.sprout.ph/v2/hr/employees/{id}",
      auth: {
        headers: [
          "Authorization: Bearer {token}",
          "Ocp-Apim-Subscription-Key: {key}",
        ],
      },
    },
  ],
};

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sprout-mcp-test-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("formatSectionContent", () => {
  it("includes method, URL, and auth headers for each endpoint", () => {
    const result = formatSectionContent(FIXTURE_SECTION);

    expect(result).toContain("GET");
    expect(result).toContain("https://api.sprout.ph/v2/hr/employees");
    expect(result).toContain("Authorization: Bearer {token}");
    expect(result).toContain("Ocp-Apim-Subscription-Key: {key}");
    expect(result).toContain("Get Employee List");
    expect(result).toContain("Get Employee By ID");
  });

  it("includes parameters when present", () => {
    const result = formatSectionContent(FIXTURE_SECTION);
    expect(result).toContain("page");
    expect(result).toContain("query");
    expect(result).toContain("Page number");
  });

  it("handles section with no endpoints gracefully", () => {
    const empty = { ...FIXTURE_SECTION, endpoints: [] };
    const result = formatSectionContent(empty);
    expect(result).toContain("No endpoints found");
  });
});

describe("registerDomainTools", () => {
  it("registers one tool per section file in the index", () => {
    // Write fixture data files
    fs.writeFileSync(
      path.join(tempDir, "hr_employees.json"),
      JSON.stringify(FIXTURE_SECTION),
      "utf-8"
    );
    fs.writeFileSync(
      path.join(tempDir, "hr_leaves.json"),
      JSON.stringify({ ...FIXTURE_SECTION, section: "leaves", sectionLabel: "Leaves" }),
      "utf-8"
    );
    fs.writeFileSync(
      path.join(tempDir, "payroll_runs.json"),
      JSON.stringify({ ...FIXTURE_SECTION, group: "payroll", groupLabel: "Payroll", section: "runs", sectionLabel: "Runs" }),
      "utf-8"
    );

    const index = {
      groups: [
        {
          label: "HR",
          sections: [
            { file: "hr_employees.json", toolName: "get_hr_employees_ref", description: "HR Employees" },
            { file: "hr_leaves.json", toolName: "get_hr_leaves_ref", description: "HR Leaves" },
          ],
        },
        {
          label: "Payroll",
          sections: [
            { file: "payroll_runs.json", toolName: "get_payroll_runs_ref", description: "Payroll Runs" },
          ],
        },
      ],
    };
    fs.writeFileSync(path.join(tempDir, "_index.json"), JSON.stringify(index), "utf-8");

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const count = registerDomainTools(server, tempDir);

    expect(count).toBe(3);
  });

  it("returns 0 and warns when _index.json is missing", () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const count = registerDomainTools(server, tempDir);
    expect(count).toBe(0);
  });
});
