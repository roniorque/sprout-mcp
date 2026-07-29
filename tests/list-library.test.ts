import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { buildListLibraryContent } from "../src/tools/list-library.js";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sprout-mcp-test-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("list_library", () => {
  it("returns TOC with all groups and section tool names", () => {
    const index = {
      groups: [
        {
          label: "HR",
          sections: [
            { file: "hr_employees.json", toolName: "get_hr_employees_ref", description: "HR Employees API reference" },
            { file: "hr_leaves.json", toolName: "get_hr_leaves_ref", description: "HR Leaves API reference" },
          ],
        },
        {
          label: "Payroll",
          sections: [
            { file: "payroll_runs.json", toolName: "get_payroll_runs_ref", description: "Payroll Runs API reference" },
          ],
        },
      ],
    };

    fs.writeFileSync(path.join(tempDir, "_index.json"), JSON.stringify(index), "utf-8");

    const result = buildListLibraryContent(tempDir);

    expect(result).toContain("Sprout.ph API Library");
    expect(result).toContain("HR");
    expect(result).toContain("Payroll");
    expect(result).toContain("get_hr_employees_ref");
    expect(result).toContain("get_hr_leaves_ref");
    expect(result).toContain("get_payroll_runs_ref");
    expect(result).toContain("HR Employees API reference");
  });

  it("returns fallback message when _index.json is missing", () => {
    const result = buildListLibraryContent(tempDir);

    expect(result).toContain("No API reference data found");
    expect(result).toContain("fetch-docs");
  });

  it("returns fallback message when groups array is empty", () => {
    fs.writeFileSync(path.join(tempDir, "_index.json"), JSON.stringify({ groups: [] }), "utf-8");

    const result = buildListLibraryContent(tempDir);

    expect(result).toContain("No API reference data found");
  });
});
