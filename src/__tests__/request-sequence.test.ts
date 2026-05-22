import { describe, expect, it } from "vitest";
import { createRequestSequence } from "../lib/request-sequence";

describe("createRequestSequence", () => {
  it("marks only the latest request id as current", () => {
    const sequence = createRequestSequence();

    const first = sequence.next();
    const second = sequence.next();

    expect(sequence.isCurrent(first)).toBe(false);
    expect(sequence.isCurrent(second)).toBe(true);
  });

  it("does not share counters across independent sequences", () => {
    const firstSequence = createRequestSequence();
    const secondSequence = createRequestSequence();

    expect(firstSequence.next()).toBe(1);
    expect(firstSequence.next()).toBe(2);

    expect(secondSequence.next()).toBe(1);
    expect(secondSequence.isCurrent(1)).toBe(true);
  });
});
