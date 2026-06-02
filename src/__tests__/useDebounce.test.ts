// @vitest-environment jsdom
/**
 * Tests for the useDebounce hook.
 *
 * Verifies:
 *   - Returns the initial value immediately on mount
 *   - Does not update the debounced value before `delay` ms have elapsed
 *   - Updates the debounced value after `delay` ms have elapsed
 *   - Only fires once when the input changes multiple times within the delay window
 *   - Resets the timer on each new change (trailing debounce behavior)
 */

import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "../hooks/useDebounce";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebounce", () => {
  it("returns the initial value on mount", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("does not update the debounced value before delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } },
    );

    rerender({ value: "updated", delay: 300 });

    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(result.current).toBe("initial");
  });

  it("updates the debounced value after delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } },
    );

    rerender({ value: "updated", delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("updated");
  });

  it("only fires once when value changes multiple times within delay window (trailing debounce)", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    );

    rerender({ value: "b", delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: "c", delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: "d", delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });

    // Still 300ms have not passed since the last change
    expect(result.current).toBe("a");

    act(() => { vi.advanceTimersByTime(200); });

    // Now 300ms have passed since last change ("d")
    expect(result.current).toBe("d");
  });

  it("works with non-string types (number)", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 300 } },
    );

    rerender({ value: 42, delay: 300 });
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe(42);
  });

  it("handles empty string edge case", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "some query", delay: 300 } },
    );

    rerender({ value: "", delay: 300 });
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe("");
  });
});
