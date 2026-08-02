import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStartConsultationWithToast } from "./use-start-consultation-with-toast";
import { useNavigate } from "react-router";
import { useStartConsultation } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock("@workspace/data-access", async () => {
  const actual = await vi.importActual("@workspace/data-access");
  return {
    ...actual,
    useStartConsultation: vi.fn(),
  };
});

vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useStartConsultationWithToast", () => {
  it("navigates to consultation on success", async () => {
    const mockNavigate = vi.fn();
    const mockMutateAsync = vi.fn().mockResolvedValue({ appointmentId: "apt-1" });
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
    (useStartConsultation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const { result } = renderHook(() => useStartConsultationWithToast());

    await act(async () => {
      await result.current.start("apt-1");
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({ appointmentId: "apt-1" });
    expect(mockNavigate).toHaveBeenCalledWith("/consultation/apt-1");
    expect(showUserFacingErrorToast).not.toHaveBeenCalled();
  });

  it("shows error toast on failure", async () => {
    const mockMutateAsync = vi.fn().mockRejectedValue(new Error("API error"));
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
    (useStartConsultation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const { result } = renderHook(() => useStartConsultationWithToast());

    await act(async () => {
      await result.current.start("apt-2");
    });

    expect(showUserFacingErrorToast).toHaveBeenCalledWith(
      expect.any(Error),
      "We could not open this consultation. Please try again.",
      "save",
    );
  });

  it("exposes isPending from the mutation", () => {
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
    (useStartConsultation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });

    const { result } = renderHook(() => useStartConsultationWithToast());
    expect(result.current.isPending).toBe(true);
  });
});
