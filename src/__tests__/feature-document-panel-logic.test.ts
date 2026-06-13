import { describe, expect, it, vi } from "vitest";

// Types and logic duplicated from feature-document-panel.tsx / feature-ide-docs-panel.tsx
// (logic-extraction pattern: mirrors component behaviour as pure functions so they can be
// tested without a DOM / @testing-library/react — matches agent-chat/*-logic.test.ts)

type EditMode = "view" | "edit";
type EditState = "raw" | "preview";
type DocContent = { content: string; sha: string; url?: string } | null;
type PrStatus = { state: "none" | "open" | "merged"; url?: string | null } | null;

// enterEdit logic: seeds editText from the latest committed content
function resolveEditText(docContent: DocContent): string {
  return docContent?.content ?? "";
}

function resolveEnterEditState(): { mode: EditMode; editState: EditState; isDirty: boolean } {
  return { mode: "edit", editState: "raw", isDirty: false };
}

// Preview toggle: flips raw ↔ preview
function toggleEditState(current: EditState): EditState {
  return current === "raw" ? "preview" : "raw";
}

// handleTextChange: marks document dirty and clears the stale-conflict flag
function handleTextChange(newText: string): { editText: string; isDirty: boolean; staleConflict: boolean } {
  return { editText: newText, isDirty: true, staleConflict: false };
}

// resolveDiscard: skips confirm when clean; prompts when dirty
function resolveDiscard(isDirty: boolean, confirmFn: (msg: string) => boolean): boolean {
  if (!isDirty) return true;
  return confirmFn("Discard unsaved changes?");
}

// PrStatusIndicator: maps prStatus → which branch to render
function resolvePrIndicatorVariant(prStatus: PrStatus): "none" | "open" | "merged" | null {
  if (!prStatus || prStatus.state === "none") return "none";
  if (prStatus.state === "open" && prStatus.url) return "open";
  if (prStatus.state === "merged") return "merged";
  return null;
}

// ---------------------------------------------------------------------------

describe("enterEdit — resolveEditText", () => {
  it("seeds editText from docContent.content", () => {
    const docContent: DocContent = { content: "# Hello\n\nWorld", sha: "abc123" };
    expect(resolveEditText(docContent)).toBe("# Hello\n\nWorld");
  });

  it("falls back to empty string when docContent is null", () => {
    expect(resolveEditText(null)).toBe("");
  });

  it("falls back to empty string when content is empty", () => {
    expect(resolveEditText({ content: "", sha: "abc" })).toBe("");
  });
});

describe("enterEdit — initial edit state", () => {
  it("sets mode=edit, editState=raw, isDirty=false", () => {
    const state = resolveEnterEditState();
    expect(state.mode).toBe("edit");
    expect(state.editState).toBe("raw");
    expect(state.isDirty).toBe(false);
  });
});

describe("toggleEditState — preview toggle", () => {
  it("toggles raw → preview", () => {
    expect(toggleEditState("raw")).toBe("preview");
  });

  it("toggles preview → raw", () => {
    expect(toggleEditState("preview")).toBe("raw");
  });

  it("double-toggle returns to origin", () => {
    expect(toggleEditState(toggleEditState("raw"))).toBe("raw");
    expect(toggleEditState(toggleEditState("preview"))).toBe("preview");
  });
});

describe("handleTextChange — dirty tracking", () => {
  it("marks isDirty true on any text change", () => {
    expect(handleTextChange("new content").isDirty).toBe(true);
  });

  it("updates editText to the new value", () => {
    expect(handleTextChange("# Updated").editText).toBe("# Updated");
  });

  it("clears staleConflict flag", () => {
    expect(handleTextChange("any").staleConflict).toBe(false);
  });
});

describe("resolveDiscard — dirty-guard confirm behavior", () => {
  it("exits immediately without confirm when not dirty", () => {
    const confirmFn = vi.fn(() => true);
    const result = resolveDiscard(false, confirmFn);
    expect(result).toBe(true);
    expect(confirmFn).not.toHaveBeenCalled();
  });

  it("prompts confirm when dirty and user confirms", () => {
    const confirmFn = vi.fn(() => true);
    const result = resolveDiscard(true, confirmFn);
    expect(result).toBe(true);
    expect(confirmFn).toHaveBeenCalledWith("Discard unsaved changes?");
  });

  it("prompts confirm when dirty and user cancels", () => {
    const confirmFn = vi.fn(() => false);
    const result = resolveDiscard(true, confirmFn);
    expect(result).toBe(false);
    expect(confirmFn).toHaveBeenCalledWith("Discard unsaved changes?");
  });
});

describe("resolvePrIndicatorVariant — PrStatusIndicator rendering states", () => {
  it("returns 'none' when prStatus is null", () => {
    expect(resolvePrIndicatorVariant(null)).toBe("none");
  });

  it("returns 'none' when prStatus.state is 'none'", () => {
    expect(resolvePrIndicatorVariant({ state: "none" })).toBe("none");
  });

  it("returns 'open' when state is open with a URL", () => {
    expect(resolvePrIndicatorVariant({ state: "open", url: "https://github.com/pr/1" })).toBe("open");
  });

  it("returns null when state is open but URL is absent", () => {
    expect(resolvePrIndicatorVariant({ state: "open", url: null })).toBeNull();
  });

  it("returns 'merged' when state is merged (no URL needed)", () => {
    expect(resolvePrIndicatorVariant({ state: "merged" })).toBe("merged");
  });

  it("returns 'merged' when state is merged with a URL", () => {
    expect(resolvePrIndicatorVariant({ state: "merged", url: "https://github.com/pr/1" })).toBe("merged");
  });
});
