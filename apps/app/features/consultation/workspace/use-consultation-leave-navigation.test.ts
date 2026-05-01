import { renderHook, act } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import type { ConsultationSaveHandles } from "./use-consultation-leave-navigation";
import { useConsultationLeaveNavigation } from "./use-consultation-leave-navigation";

function makeSaveHandlesRef() {
  return createRef<ConsultationSaveHandles | null>();
}

const push = vi.fn();
const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    back,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/providers/navigation-history-provider", () => ({
  readInAppNavCount: () => 0,
}));

describe("useConsultationLeaveNavigation", () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    useConsultationDraft.getState().reset();
  });

  it("navigates immediately when read-only", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: true,
        fallbackRoute: "/consultation",
        saveHandlesRef,
      }),
    );

    act(() => {
      result.current.tryNavigateAway();
    });

    expect(push).toHaveBeenCalledWith("/consultation");
    expect(result.current.leaveDialogOpen).toBe(false);
  });

  it("navigates when draft is clean and idle", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    useConsultationDraft.getState().hydrate("apt-1", {});

    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
      }),
    );

    act(() => {
      result.current.tryNavigateAway();
    });

    expect(push).toHaveBeenCalledWith("/consultation");
    expect(result.current.leaveDialogOpen).toBe(false);
  });

  it("opens dialog when draft is dirty", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().setHistory("note");

    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
      }),
    );

    act(() => {
      result.current.tryNavigateAway();
    });

    expect(push).not.toHaveBeenCalled();
    expect(result.current.leaveDialogOpen).toBe(true);
  });

  it("opens dialog when save is in flight even if not dirty", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().markSaving();

    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
      }),
    );

    act(() => {
      result.current.tryNavigateAway();
    });

    expect(push).not.toHaveBeenCalled();
    expect(result.current.leaveDialogOpen).toBe(true);
  });
});
