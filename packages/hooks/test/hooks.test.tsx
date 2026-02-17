/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatShortcut,
  useClickOutside,
  useDebounce,
  useIntersectionObserver,
  useKeyboardShortcuts,
  useLocalStorage,
  useMediaQuery,
  useMedicalCalculations,
  useMounted,
  useSessionStorage,
  useToggle,
} from "../src/index.js";

describe("@workspace/hooks", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("toggles boolean state", () => {
    const { result } = renderHook(() => useToggle());

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[2](false);
    });

    expect(result.current[0]).toBe(false);
  });

  it("reports mounted state after effect", () => {
    const { result } = renderHook(() => useMounted());
    expect(result.current).toBe(true);
  });

  it("debounces value updates", () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: "a" } },
    );

    expect(result.current).toBe("a");

    rerender({ value: "ab" });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("ab");
  });

  it("reads and writes localStorage", async () => {
    localStorage.setItem("theme", JSON.stringify("dark"));

    const { result } = renderHook(() => useLocalStorage("theme", "light"));

    await waitFor(() => {
      expect(result.current[0]).toBe("dark");
    });

    act(() => {
      result.current[1]("light");
    });

    expect(localStorage.getItem("theme")).toBe(JSON.stringify("light"));
    expect(result.current[0]).toBe("light");
  });

  it("reads and writes sessionStorage", async () => {
    sessionStorage.setItem("draft", JSON.stringify("v1"));

    const { result } = renderHook(() => useSessionStorage("draft", "v0"));

    await waitFor(() => {
      expect(result.current[0]).toBe("v1");
    });

    act(() => {
      result.current[1]((prev: string) => `${prev}-updated`);
    });

    expect(sessionStorage.getItem("draft")).toBe(JSON.stringify("v1-updated"));
    expect(result.current[0]).toBe("v1-updated");
  });

  it("triggers keyboard shortcuts and skips plain shortcuts in input", () => {
    const action = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          {
            key: "k",
            modifiers: ["ctrl"],
            description: "Do action",
            action,
          },
          {
            key: "a",
            description: "Plain action",
            action,
          },
        ],
      }),
    );

    const ctrlK = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
    document.dispatchEvent(ctrlK);
    expect(action).toHaveBeenCalledTimes(1);

    const input = document.createElement("input");
    document.body.appendChild(input);

    const plainInInput = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
    });
    input.dispatchEvent(plainInInput);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it("formats shortcut labels and calculates BMI", () => {
    expect(
      formatShortcut({ key: "k", description: "Search", action: () => {} }),
    ).toBe("K");

    const { result } = renderHook(() => useMedicalCalculations(70, 170));

    expect(result.current.bmi).toBe(24.2);
    expect(result.current.bmiCategory).toBeDefined();
    expect(result.current.bmiStatus).toBe("normal");
  });

  it("tracks media query updates", () => {
    let listener: (() => void) | null = null;
    let isMatch = true;

    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() {
        return isMatch;
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, callback: () => void) => {
        listener = callback;
      },
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);

    act(() => {
      isMatch = false;
      listener?.();
    });

    expect(result.current).toBe(false);
  });

  it("fires callback only for outside clicks", () => {
    const onOutsideClick = vi.fn();
    const container = document.createElement("div");
    const inside = document.createElement("button");
    const outside = document.createElement("button");

    container.appendChild(inside);
    document.body.appendChild(container);
    document.body.appendChild(outside);

    const ref = { current: container };
    renderHook(() => useClickOutside(ref, onOutsideClick));

    act(() => {
      inside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(onOutsideClick).not.toHaveBeenCalled();

    act(() => {
      outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(onOutsideClick).toHaveBeenCalledTimes(1);
  });

  it("tracks intersection observer visibility", () => {
    let observerCallback: IntersectionObserverCallback | null = null;

    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }

      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }

      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds = [];
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    const element = document.createElement("div");
    const ref = { current: element };
    const { result } = renderHook(() => useIntersectionObserver(ref));

    expect(result.current).toBe(false);

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(result.current).toBe(true);
  });
});
