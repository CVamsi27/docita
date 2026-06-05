import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ClinicDetails,
  ComplianceSettings,
} from "@/features/onboarding/components/types";
import { useClinicRegistrationFlow } from "./use-clinic-registration-flow";

const mocks = vi.hoisted(() => ({
  user: {
    id: "user_1",
    name: "Owner One",
    email: "owner@example.com",
    role: "ADMIN" as const,
    clinicId: null,
    onboardingStep: "CREATING_CLINIC" as const,
  },
  refreshUser: vi.fn(),
  openCheckout: vi.fn(),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
  },
  fetch: vi.fn(),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: mocks.user,
    refreshUser: mocks.refreshUser,
  }),
}));

vi.mock("@/hooks/use-razorpay", () => ({
  useRazorpay: () => ({
    openCheckout: mocks.openCheckout,
  }),
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

const validClinicDetails: ClinicDetails = {
  name: "Acme Clinic",
  email: "clinic@example.com",
  phone: "+919876543210",
  addressLine1: "123 Main Street",
  addressLine2: "Near Central Park",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "500001",
  address: "123 Main Street, Near Central Park, Hyderabad, Telangana, 500001, IN",
  facilityLabel: "CLINIC",
  countryCode: "IN",
  type: "GENERAL",
  website: "",
  gstin: "",
  mapsLocation: { lat: 17.385, lng: 78.4867 },
};

const validCompliance: ComplianceSettings = {
  acceptedSLA: true,
  acceptedPrivacyPolicy: true,
  acceptedDataProcessing: true,
  enableWhatsApp: false,
  requireConsent: true,
  slaSignatureSessionId: "sess_123",
};

describe("useClinicRegistrationFlow", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    mocks.refreshUser.mockReset();
    mocks.openCheckout.mockReset();
    mocks.toast.error.mockReset();
    mocks.toast.success.mockReset();
    mocks.toast.info.mockReset();
    mocks.toast.message.mockReset();
    mocks.fetch.mockReset();
    global.fetch = mocks.fetch as typeof fetch;
    mocks.user = {
      id: "user_1",
      name: "Owner One",
      email: "owner@example.com",
      role: "ADMIN",
      clinicId: null,
      onboardingStep: "CREATING_CLINIC",
    };
  });

  it("restores persisted onboarding form data and step after refresh", async () => {
    const { result, unmount } = renderHook(() => useClinicRegistrationFlow());

    act(() => {
      result.current.setClinicDetails(validClinicDetails);
    });

    expect(result.current.step).toBe(2);
    expect(sessionStorage.getItem("docita_onboarding_form_data")).toContain(
      "Acme Clinic",
    );

    unmount();

    const { result: restored } = renderHook(() => useClinicRegistrationFlow());

    expect(restored.current.step).toBe(2);
    expect(restored.current.formData.clinicDetails.name).toBe("Acme Clinic");
    expect(restored.current.formData.clinicDetails.email).toBe(
      "clinic@example.com",
    );
  });

  it("moves to the earliest incomplete step and surfaces missing items when submit is attempted with incomplete data", async () => {
    const { result } = renderHook(() => useClinicRegistrationFlow());

    act(() => {
      result.current.setStep(4);
    });

    let submitError: unknown = null;
    await act(async () => {
      try {
        await result.current.submitRegistration(validCompliance, vi.fn());
      } catch (error) {
        submitError = error;
      }
    });

    await waitFor(() => {
      expect(result.current.step).toBe(1);
    });

    expect(submitError).toBeInstanceOf(Error);
    expect((submitError as Error).message).toContain(
      "Complete the pending onboarding items before continuing",
    );
    expect(mocks.toast.error).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("docita_onboarding_step")).toBe("1");
  });

  it("restarts from step 1 when backend returns success=false with session-invalid error", async () => {
    mocks.fetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/onboarding/initialize")) {
        return new Response(JSON.stringify({ onboardingId: "onb_test_1" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/onboarding/onb_test_1/progress")) {
        return new Response(JSON.stringify({ onboardingId: "onb_test_1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/onboarding/onb_test_1/trial-eligibility")) {
        return new Response(JSON.stringify({ eligible: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/onboarding/onb_test_1/complete")) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Onboarding failed. Please try again.",
            errors: ["Onboarding session not found or expired"],
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const { result } = renderHook(() => useClinicRegistrationFlow());

    act(() => {
      result.current.setClinicDetails(validClinicDetails);
    });

    await act(async () => {
      await result.current.setTeamMembers([]);
    });

    await act(async () => {
      await result.current.setPlanSelection("ESSENTIAL", "MONTHLY", {
        monthly: 999,
        yearly: 9990,
      });
    });

    expect(result.current.step).toBe(5);

    await act(async () => {
      await result.current.submitRegistration(validCompliance, vi.fn());
    });

    await waitFor(() => {
      expect(result.current.step).toBe(1);
    });

    expect(mocks.toast.error).toHaveBeenCalledWith(
      "We could not finish setup. Please start again.",
      { duration: 8000 },
    );
  });

  it("forceRefresh always initializes a fresh onboarding session id", async () => {
    sessionStorage.setItem("docita_onboarding_id", "onb_stale_1");

    mocks.fetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/onboarding/initialize")) {
        return new Response(JSON.stringify({ onboardingId: "onb_fresh_2" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/onboarding/onb_stale_1/progress")) {
        return new Response(JSON.stringify({ onboardingId: "onb_stale_1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const { result } = renderHook(() => useClinicRegistrationFlow());

    let onboardingId = "";
    await act(async () => {
      onboardingId = await result.current.ensureOnboardingId({
        forceRefresh: true,
      });
    });

    expect(onboardingId).toBe("onb_fresh_2");
    expect(sessionStorage.getItem("docita_onboarding_id")).toBe("onb_fresh_2");
    expect(
      mocks.fetch.mock.calls.some(([input]) =>
        String(input).includes("/onboarding/onb_stale_1/progress"),
      ),
    ).toBe(false);
  });

  it("opens paid Essential checkout for a returning customer without changing tier", async () => {
    mocks.fetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/onboarding/initialize")) {
        return new Response(JSON.stringify({ onboardingId: "onb_repeat_1" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/onboarding/onb_repeat_1/trial-eligibility")) {
        return new Response(JSON.stringify({ eligible: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/onboarding/onb_repeat_1/checkout")) {
        return new Response(
          JSON.stringify({
            orderId: "order_repeat_1",
            amountCents: 99900,
            currency: "INR",
            razorpayKeyId: "rzp_test_repeat",
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    mocks.openCheckout.mockResolvedValueOnce({ status: "canceled" });

    const { result } = renderHook(() => useClinicRegistrationFlow());

    act(() => {
      result.current.setClinicDetails(validClinicDetails);
    });
    await act(async () => {
      await result.current.setPlanSelection("ESSENTIAL", "MONTHLY", {
        monthly: 999,
        yearly: 9990,
      });
    });

    expect(mocks.toast.info).toHaveBeenCalledWith(
      "Your free trial has already been used. Complete payment to continue.",
    );
    expect(mocks.openCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 99900,
        description: "ESSENTIAL MONTHLY subscription",
      }),
    );
    expect(result.current.formData.planSelection.tier).toBe("ESSENTIAL");
    expect(result.current.step).not.toBe(5);
  });
});
