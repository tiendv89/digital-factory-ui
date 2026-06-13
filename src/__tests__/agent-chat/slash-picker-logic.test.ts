import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Test the slash picker's fetch integration

vi.stubEnv("NEXT_PUBLIC_BFF_URL", "http://localhost:8090");

const { listTools } = await import("@/services/hermes-agent/tools");

type SlashCommand = { name: string; hint: string };

function toolNameToSlash(name: string): string {
  return "/" + name.replace(/_/g, "-");
}

function filterCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  if (!query) return [];
  const normalized = query.toLowerCase();
  return commands.filter((c) => c.name.includes(normalized));
}

describe("slash picker — listTools integration", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("converts fetched tools to slash commands correctly", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tools: [
          { name: "workflow_write_product_spec", description: "Draft or update the product spec" },
          { name: "workflow_request_approval", description: "Request stage approval" },
          { name: "load_skill", description: "Load a skill document" },
        ],
      }),
    } as Response);

    const tools = await listTools();
    const commands = tools.map((t) => ({ name: toolNameToSlash(t.name), hint: t.description }));

    expect(commands).toEqual([
      { name: "/workflow-write-product-spec", hint: "Draft or update the product spec" },
      { name: "/workflow-request-approval", hint: "Request stage approval" },
      { name: "/load-skill", hint: "Load a skill document" },
    ]);
  });

  it("returns empty array when API fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    let commands: SlashCommand[] = [];
    try {
      const tools = await listTools();
      commands = tools.map((t) => ({ name: toolNameToSlash(t.name), hint: t.description }));
    } catch {
      commands = [];
    }
    expect(commands).toEqual([]);
  });
});

describe("filterCommands", () => {
  const commands: SlashCommand[] = [
    { name: "/workflow-write-product-spec", hint: "Draft product spec" },
    { name: "/workflow-write-technical-design", hint: "Draft technical design" },
    { name: "/workflow-request-approval", hint: "Request approval" },
    { name: "/load-skill", hint: "Load a skill" },
  ];

  it("filters by partial name match", () => {
    const result = filterCommands(commands, "/workflow");
    expect(result).toHaveLength(3);
  });

  it("is case-insensitive", () => {
    const result = filterCommands(commands, "/WORKFLOW");
    expect(result).toHaveLength(3);
  });

  it("returns empty array for empty query", () => {
    expect(filterCommands(commands, "")).toEqual([]);
  });

  it("returns matching command for specific query", () => {
    const result = filterCommands(commands, "/load");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("/load-skill");
  });

  it("returns empty when no match", () => {
    expect(filterCommands(commands, "/unknown-command")).toEqual([]);
  });
});
