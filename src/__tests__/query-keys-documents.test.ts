import { describe, expect, it } from "vitest";

import { workspaceKeys } from "@/constants/query-keys";

describe("workspaceKeys.documentContent", () => {
  it("produces a unique key for each workspace/feature/type combination", () => {
    const k1 = workspaceKeys.documentContent("ws-1", "feat-1", "product_spec");
    const k2 = workspaceKeys.documentContent("ws-1", "feat-1", "technical_design");
    const k3 = workspaceKeys.documentContent("ws-1", "feat-2", "product_spec");
    const k4 = workspaceKeys.documentContent("ws-2", "feat-1", "product_spec");

    // Same args → same key
    expect(k1).toEqual(workspaceKeys.documentContent("ws-1", "feat-1", "product_spec"));

    // Different type → different key
    expect(k1).not.toEqual(k2);

    // Different feature → different key
    expect(k1).not.toEqual(k3);

    // Different workspace → different key
    expect(k1).not.toEqual(k4);
  });

  it("is nested under the feature key prefix", () => {
    const docKey = workspaceKeys.documentContent("ws-1", "feat-1", "product_spec");
    const featureKey = workspaceKeys.feature("ws-1", "feat-1");
    // Document key must start with the same workspace/feature prefix so that
    // invalidating the feature query also invalidates the document query.
    expect(docKey.slice(0, featureKey.length)).toEqual(featureKey);
  });
});

describe("workspaceKeys.documentPr", () => {
  it("produces a unique key for each workspace/feature combination", () => {
    const k1 = workspaceKeys.documentPr("ws-1", "feat-1");
    const k2 = workspaceKeys.documentPr("ws-1", "feat-2");
    const k3 = workspaceKeys.documentPr("ws-2", "feat-1");

    expect(k1).toEqual(workspaceKeys.documentPr("ws-1", "feat-1"));
    expect(k1).not.toEqual(k2);
    expect(k1).not.toEqual(k3);
  });

  it("is nested under the feature key prefix", () => {
    const prKey = workspaceKeys.documentPr("ws-1", "feat-1");
    const featureKey = workspaceKeys.feature("ws-1", "feat-1");
    expect(prKey.slice(0, featureKey.length)).toEqual(featureKey);
  });
});
