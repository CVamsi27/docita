import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AskAiProvider, useAskAi } from "./ask-ai-context";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AskAiProvider>{children}</AskAiProvider>;
}

describe("AskAiContext", () => {
  it("opens the overlay and stores the supplied scope", () => {
    const { result } = renderHook(() => useAskAi(), { wrapper });
    expect(result.current.open).toBe(false);
    expect(result.current.scope).toBeNull();

    act(() => {
      result.current.openOverlay({ id: "patient:abc", label: "on Patient ABC" });
    });

    expect(result.current.open).toBe(true);
    expect(result.current.scope?.id).toBe("patient:abc");
  });

  it("closes the overlay without clearing scope", () => {
    const { result } = renderHook(() => useAskAi(), { wrapper });
    act(() => {
      result.current.openOverlay({ id: "today", label: "on Today" });
    });
    act(() => {
      result.current.closeOverlay();
    });
    expect(result.current.open).toBe(false);
    expect(result.current.scope?.id).toBe("today");
  });

  it("throws when used outside the provider", () => {
    expect(() => renderHook(() => useAskAi())).toThrow(/AskAiProvider/);
  });
});
