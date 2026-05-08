import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REFRESH_INTERVAL_MS = 60_000;

describe("auto-refresh interval behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call reload before 60 seconds", () => {
    const reload = vi.fn();
    const id = setInterval(reload, REFRESH_INTERVAL_MS);

    vi.advanceTimersByTime(59_999);
    expect(reload).not.toHaveBeenCalled();

    clearInterval(id);
  });

  it("calls reload once after exactly 60 seconds", () => {
    const reload = vi.fn();
    const id = setInterval(reload, REFRESH_INTERVAL_MS);

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    expect(reload).toHaveBeenCalledTimes(1);

    clearInterval(id);
  });

  it("calls reload twice after 120 seconds", () => {
    const reload = vi.fn();
    const id = setInterval(reload, REFRESH_INTERVAL_MS);

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS * 2);
    expect(reload).toHaveBeenCalledTimes(2);

    clearInterval(id);
  });

  it("stops calling reload after interval is cleared (unmount cleanup)", () => {
    const reload = vi.fn();
    const id = setInterval(reload, REFRESH_INTERVAL_MS);

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    expect(reload).toHaveBeenCalledTimes(1);

    clearInterval(id);

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS * 3);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("uses a ref so reload identity changes do not reset the interval", () => {
    let reloadRef = vi.fn();
    const ref = { current: reloadRef };

    const id = setInterval(() => {
      ref.current();
    }, REFRESH_INTERVAL_MS);

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    expect(reloadRef).toHaveBeenCalledTimes(1);

    const newReload = vi.fn();
    ref.current = newReload;

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    expect(reloadRef).toHaveBeenCalledTimes(1);
    expect(newReload).toHaveBeenCalledTimes(1);

    clearInterval(id);
  });
});
