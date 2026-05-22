import { afterEach, describe, expect, it, vi } from "vitest";
import { createSingleDoubleClickController } from "../lib/click-intent";

describe("createSingleDoubleClickController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays single click until the double-click window passes", () => {
    vi.useFakeTimers();
    const onSingleClick = vi.fn();
    const onDoubleClick = vi.fn();
    const controller = createSingleDoubleClickController({
      delayMs: 180,
      onSingleClick,
      onDoubleClick,
    });

    controller.handleClick();

    expect(onSingleClick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(179);
    expect(onSingleClick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSingleClick).toHaveBeenCalledTimes(1);
    expect(onDoubleClick).not.toHaveBeenCalled();
  });

  it("cancels the pending single click when a double click arrives", () => {
    vi.useFakeTimers();
    const onSingleClick = vi.fn();
    const onDoubleClick = vi.fn();
    const controller = createSingleDoubleClickController({
      delayMs: 180,
      onSingleClick,
      onDoubleClick,
    });

    controller.handleClick();
    controller.handleDoubleClick();
    vi.advanceTimersByTime(180);

    expect(onSingleClick).not.toHaveBeenCalled();
    expect(onDoubleClick).toHaveBeenCalledTimes(1);
  });
});
