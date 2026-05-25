import { renderHook, act, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import type { ConsultationSaveHandles } from "./use-consultation-leave-navigation";
import {
  CONSULTATION_LEAVE_GUARD_SKIP_ATTR,
  isSameConsultationAppointmentPathname,
} from "./consultation-leave-navigation-helpers";
import { useConsultationLeaveNavigation } from "./use-consultation-leave-navigation";

function makeSaveHandlesRef() {
  return createRef<ConsultationSaveHandles | null>();
}

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();

const readInAppNavCountMock = vi.hoisted(() => vi.fn(() => 0));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    back,
    replace,
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/providers/navigation-history-provider", () => ({
  readInAppNavCount: () => readInAppNavCountMock(),
}));

let historyPushStateSpy: ReturnType<typeof vi.spyOn> | null = null;
let historyBackSpy: ReturnType<typeof vi.spyOn> | null = null;

describe("isSameConsultationAppointmentPathname", () => {
  it("matches only the active appointment detail path", () => {
    expect(
      isSameConsultationAppointmentPathname("/consultation/apt-1", "apt-1"),
    ).toBe(true);
    expect(
      isSameConsultationAppointmentPathname(
        "/consultation/apt-1",
        "other-id",
      ),
    ).toBe(false);
    expect(
      isSameConsultationAppointmentPathname("/consultation/apt-1/extra", "apt-1"),
    ).toBe(false);
    expect(isSameConsultationAppointmentPathname("/dashboard", "apt-1")).toBe(
      false,
    );
  });
});

describe("useConsultationLeaveNavigation", () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    replace.mockClear();
    readInAppNavCountMock.mockReturnValue(0);
    useConsultationDraft.getState().reset();
    historyPushStateSpy = vi
      .spyOn(window.history, "pushState")
      .mockImplementation(() => {});
    historyBackSpy = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    historyPushStateSpy?.mockRestore();
    historyBackSpy?.mockRestore();
    historyPushStateSpy = null;
    historyBackSpy = null;
  });

  it("navigates immediately when read-only", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: true,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
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
        activeAppointmentId: "apt-1",
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
        activeAppointmentId: "apt-1",
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
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      result.current.tryNavigateAway();
    });

    expect(push).not.toHaveBeenCalled();
    expect(result.current.leaveDialogOpen).toBe(true);
  });

  it("pushes a history trap when the draft first needs a leave guard", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    expect(historyPushStateSpy).toHaveBeenCalledTimes(1);
  });

  it("opens the leave dialog on popstate while the draft needs a leave guard", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    historyPushStateSpy?.mockClear();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(historyPushStateSpy).toHaveBeenCalledTimes(1);
    expect(result.current.leaveDialogOpen).toBe(true);
  });

  it("peels history traps when leaving without saving", async () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    historyBackSpy?.mockClear();

    act(() => {
      result.current.leaveWithoutSaving();
    });

    expect(historyBackSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/consultation");
    });
  });

  it("leave without saving uses push(fallback), not router.back(), when in-app nav depth is high", async () => {
    readInAppNavCountMock.mockReturnValue(5);
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    historyBackSpy?.mockClear();
    back.mockClear();

    act(() => {
      result.current.leaveWithoutSaving();
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/consultation");
    });
    expect(back).not.toHaveBeenCalled();
  });

  it("blocks internal link navigation when guarded and resumes after leave without saving", async () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    const anchor = document.createElement("a");
    anchor.href = "/dashboard";
    document.body.appendChild(anchor);

    act(() => {
      anchor.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
      );
    });

    expect(result.current.leaveDialogOpen).toBe(true);

    push.mockClear();

    act(() => {
      result.current.leaveWithoutSaving();
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/dashboard");
    });

    document.body.removeChild(anchor);
  });

  it("clears pending link navigation when the leave dialog is dismissed", async () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    const anchor = document.createElement("a");
    anchor.href = "/dashboard";
    document.body.appendChild(anchor);

    act(() => {
      anchor.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
      );
    });

    push.mockClear();

    act(() => {
      result.current.onLeaveDialogOpenChange(false);
    });

    act(() => {
      result.current.leaveWithoutSaving();
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/consultation");
    });

    document.body.removeChild(anchor);
  });

  it("tryNavigateAway clears a pending link so leave uses fallback navigation", async () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    const anchor = document.createElement("a");
    anchor.href = "/dashboard";
    document.body.appendChild(anchor);

    act(() => {
      anchor.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
      );
    });

    push.mockClear();

    act(() => {
      result.current.tryNavigateAway();
    });

    act(() => {
      result.current.leaveWithoutSaving();
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/consultation");
    });
    expect(push).not.toHaveBeenCalledWith("/dashboard");

    document.body.removeChild(anchor);
  });

  it("popstate clears a pending link so leave uses fallback navigation", async () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    const anchor = document.createElement("a");
    anchor.href = "/dashboard";
    document.body.appendChild(anchor);

    act(() => {
      anchor.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
      );
    });

    push.mockClear();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    act(() => {
      result.current.leaveWithoutSaving();
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/consultation");
    });
    expect(push).not.toHaveBeenCalledWith("/dashboard");

    document.body.removeChild(anchor);
  });

  it("does not intercept links inside a skip-marked subtree", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    const wrapper = document.createElement("div");
    wrapper.setAttribute(CONSULTATION_LEAVE_GUARD_SKIP_ATTR, "");
    const anchor = document.createElement("a");
    anchor.href = "/dashboard";
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
    });
    wrapper.appendChild(anchor);
    document.body.appendChild(wrapper);

    act(() => {
      anchor.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
      );
    });

    expect(result.current.leaveDialogOpen).toBe(false);

    document.body.removeChild(wrapper);
  });

  it("attemptNavigateToHref ignores hrefs containing a NUL byte", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    push.mockClear();

    act(() => {
      result.current.attemptNavigateToHref("/dashboard\u0000/x");
    });

    expect(push).not.toHaveBeenCalled();
    expect(result.current.leaveDialogOpen).toBe(false);
  });

  it("read-only attemptNavigateToHref ignores hrefs containing a NUL byte", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: true,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    push.mockClear();

    act(() => {
      result.current.attemptNavigateToHref("/dashboard\u0000");
    });

    expect(push).not.toHaveBeenCalled();
  });

  it("attemptNavigateToHref no-ops on whitespace-only hrefs", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    push.mockClear();

    act(() => {
      result.current.attemptNavigateToHref("   \n\t  ");
    });

    expect(push).not.toHaveBeenCalled();
    expect(result.current.leaveDialogOpen).toBe(false);
  });

  it("attemptNavigateToHref ignores blob URLs", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    push.mockClear();

    act(() => {
      result.current.attemptNavigateToHref("blob:http://localhost/x");
    });

    expect(push).not.toHaveBeenCalled();
    expect(result.current.leaveDialogOpen).toBe(false);
  });

  it("attemptNavigateToHref ignores javascript URLs", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    push.mockClear();

    act(() => {
      result.current.attemptNavigateToHref("javascript:void(0)");
    });

    expect(push).not.toHaveBeenCalled();
    expect(result.current.leaveDialogOpen).toBe(false);
  });

  it("blocks javascript scheme case-insensitively in the capture handler", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    const anchor = document.createElement("a");
    anchor.href = "JAVASCRIPT:void(0)";
    document.body.appendChild(anchor);

    const ev = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });

    act(() => {
      anchor.dispatchEvent(ev);
    });

    expect(ev.defaultPrevented).toBe(true);
    expect(result.current.leaveDialogOpen).toBe(false);

    document.body.removeChild(anchor);
  });

  it("blocks javascript href clicks without opening the leave dialog", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    const anchor = document.createElement("a");
    anchor.href = "javascript:void(0)";
    document.body.appendChild(anchor);

    const ev = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });

    act(() => {
      anchor.dispatchEvent(ev);
    });

    expect(ev.defaultPrevented).toBe(true);
    expect(result.current.leaveDialogOpen).toBe(false);

    document.body.removeChild(anchor);
  });

  it("blocks data URL link activation in the capture handler", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    const anchor = document.createElement("a");
    anchor.href = "data:text/plain,hello";
    document.body.appendChild(anchor);

    const ev = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });

    act(() => {
      anchor.dispatchEvent(ev);
    });

    expect(ev.defaultPrevented).toBe(true);
    expect(result.current.leaveDialogOpen).toBe(false);

    document.body.removeChild(anchor);
  });

  it("attemptNavigateToHref opens the leave dialog when guarded", async () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    act(() => {
      result.current.attemptNavigateToHref("/dashboard");
    });

    expect(result.current.leaveDialogOpen).toBe(true);
    push.mockClear();
    act(() => {
      result.current.leaveWithoutSaving();
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("attemptNavigateToHref pushes immediately when the draft does not need a guard", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
    });

    act(() => {
      result.current.attemptNavigateToHref("/dashboard");
    });

    expect(push).toHaveBeenCalledWith("/dashboard");
    expect(result.current.leaveDialogOpen).toBe(false);
  });

  it("attemptNavigateToHref pushes same-appointment URLs while guarded", () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    push.mockClear();

    act(() => {
      result.current.attemptNavigateToHref(
        "/consultation/apt-1?section=plan",
      );
    });

    expect(push).toHaveBeenCalledWith("/consultation/apt-1?section=plan");
    expect(result.current.leaveDialogOpen).toBe(false);
  });

  it("routes save and leave to a pending intercepted link", async () => {
    const saveHandlesRef = makeSaveHandlesRef();
    const flush = vi.fn().mockResolvedValue(true);
    const submitPrescriptions = vi.fn().mockResolvedValue(true);
    saveHandlesRef.current = { flush, submitPrescriptions };

    const { result } = renderHook(() =>
      useConsultationLeaveNavigation({
        readOnly: false,
        fallbackRoute: "/consultation",
        saveHandlesRef,
        activeAppointmentId: "apt-1",
      }),
    );

    act(() => {
      useConsultationDraft.getState().hydrate("apt-1", {});
      useConsultationDraft.getState().setHistory("note");
    });

    const anchor = document.createElement("a");
    anchor.href = "/settings/billing";
    document.body.appendChild(anchor);

    act(() => {
      anchor.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
      );
    });

    push.mockClear();

    await act(async () => {
      await result.current.saveAndLeave();
    });

    expect(flush).toHaveBeenCalled();
    expect(submitPrescriptions).toHaveBeenCalled();
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/settings/billing");
    });

    document.body.removeChild(anchor);
  });
});
