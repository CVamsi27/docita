import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

const originalClipboard = navigator.clipboard;
const originalShare = navigator.share;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  // Reset to defaults
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
    share: undefined,
  });
});

afterEach(() => {
  vi.useRealTimers();
  Object.assign(navigator, {
    clipboard: originalClipboard,
    share: originalShare,
  });
});

describe("useCopyToClipboard", () => {
  it("starts with copied = false", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copied).toBe(false);
  });

  it("sets copied=true after copy and resets after 2000ms", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    const text = "hello-world";

    await act(async () => {
      await result.current.copy(text);
    });

    expect(result.current.copied).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.copied).toBe(false);
  });

  it("accepts a custom reset delay", async () => {
    const { result } = renderHook(() => useCopyToClipboard(500));
    const text = "test";

    await act(async () => {
      await result.current.copy(text);
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.copied).toBe(false);
  });

  it("handles clipboard failure gracefully (copied stays false)", async () => {
    const writeTextMock = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    writeTextMock.mockRejectedValue(new Error("Clipboard denied"));

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("fail");
    });

    // Should not throw — the hook swallows clipboard errors
    expect(result.current.copied).toBe(false);
  });

  it("supports navigator.share when available", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      share: mockShare,
      clipboard: { writeText: vi.fn() },
    });

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("share-text", "Share Title");
    });

    expect(mockShare).toHaveBeenCalledWith({
      title: "Share Title",
      text: "share-text",
    });
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("handles AbortError by returning silently (no clipboard fallback)", async () => {
    const mockShare = vi.fn().mockRejectedValue(
      new DOMException("Aborted by user", "AbortError"),
    );
    Object.assign(navigator, {
      share: mockShare,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("abort-text");
    });

    // AbortError is user-cancelled share — hook returns silently, copied stays false
    expect(result.current.copied).toBe(false);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("falls back to clipboard when navigator.share fails with non-AbortError", async () => {
    const mockShare = vi.fn().mockRejectedValue(new Error("Share API denied"));
    Object.assign(navigator, {
      share: mockShare,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("fallback-text");
    });

    // Non-AbortError share failures fall back to clipboard
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("fallback-text");
    expect(result.current.copied).toBe(true);
  });
});
