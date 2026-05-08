import { describe, it, expect } from "vitest";
import type { BoardLoadError } from "../features/board/types";

describe("BoardLoadError discriminant", () => {
  it("access_denied kind is correctly typed", () => {
    const err: BoardLoadError = { kind: "access_denied", message: "Forbidden" };
    expect(err.kind).toBe("access_denied");
    expect(err.message).toBe("Forbidden");
  });

  it("not_found kind is correctly typed", () => {
    const err: BoardLoadError = { kind: "not_found", message: "Not found" };
    expect(err.kind).toBe("not_found");
    expect(err.message).toBe("Not found");
  });

  it("parse_error kind is correctly typed", () => {
    const err: BoardLoadError = { kind: "parse_error", message: "Bad YAML" };
    expect(err.kind).toBe("parse_error");
    expect(err.message).toBe("Bad YAML");
  });

  it("network_error kind is correctly typed", () => {
    const err: BoardLoadError = { kind: "network_error", message: "Timeout" };
    expect(err.kind).toBe("network_error");
    expect(err.message).toBe("Timeout");
  });

  it("discriminant switch covers all cases", () => {
    const errors: BoardLoadError[] = [
      { kind: "access_denied", message: "a" },
      { kind: "not_found", message: "b" },
      { kind: "parse_error", message: "c" },
      { kind: "network_error", message: "d" },
    ];

    const results = errors.map((err) => {
      switch (err.kind) {
        case "access_denied":
          return "reconnect";
        case "not_found":
          return "no_workflow";
        case "parse_error":
          return "sync_retry";
        case "network_error":
          return "generic_retry";
      }
    });

    expect(results).toEqual([
      "reconnect",
      "no_workflow",
      "sync_retry",
      "generic_retry",
    ]);
  });
});
