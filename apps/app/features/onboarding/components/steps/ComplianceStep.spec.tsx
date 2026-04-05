import { render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ComplianceSettings } from "@/features/onboarding/components/types";
import { ComplianceStep } from "./ComplianceStep";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: mocks.toast }));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code">{value}</div>
  ),
}));

vi.mock("@/features/legal", () => ({
  SLAContent: () => <div>SLA</div>,
  PrivacyPolicyContent: () => <div>Privacy</div>,
  DataProcessingAgreementContent: () => <div>DPA</div>,
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  (
    globalThis as typeof globalThis & {
      ResizeObserver?: typeof ResizeObserverMock;
    }
  ).ResizeObserver = ResizeObserverMock;
}

const defaultValues: ComplianceSettings = {
  acceptedSLA: false,
  acceptedPrivacyPolicy: false,
  acceptedDataProcessing: false,
  enableWhatsApp: true,
  requireConsent: true,
  slaSignatureSessionId: "",
};

function ComplianceStepHarness({
  onboardingId,
  ensureOnboardingId,
  onFormReady,
}: {
  onboardingId?: string;
  ensureOnboardingId?: (options?: {
    forceRefresh?: boolean;
  }) => Promise<string>;
  onFormReady: (form: UseFormReturn<ComplianceSettings>) => void;
}) {
  const complianceForm = useForm<ComplianceSettings>({
    defaultValues,
  });

  useEffect(() => {
    onFormReady(complianceForm);
  }, [complianceForm, onFormReady]);

  return (
    <ComplianceStep
      complianceForm={complianceForm}
      onboardingId={onboardingId}
      ensureOnboardingId={ensureOnboardingId}
      onBack={() => {}}
      onSubmit={async () => {}}
    />
  );
}

describe("ComplianceStep", () => {
  beforeEach(() => {
    mocks.fetch.mockReset();
    mocks.toast.success.mockReset();
    mocks.toast.error.mockReset();
    mocks.toast.info.mockReset();
    mocks.toast.message.mockReset();
    sessionStorage.clear();
    global.fetch = mocks.fetch as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-detects uploaded signature from polling and sets signature session id", async () => {
    const ensureOnboardingId = vi.fn().mockResolvedValue("onb_1");
    const setIntervalSpy = vi
      .spyOn(globalThis, "setInterval")
      .mockImplementation((handler: TimerHandler) => {
        if (typeof handler === "function") {
          void handler();
        }
        return setTimeout(() => undefined, 0) as ReturnType<typeof setInterval>;
      });
    const clearIntervalSpy = vi
      .spyOn(globalThis, "clearInterval")
      .mockImplementation(() => {});

    mocks.fetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (
        url.includes("/onboarding/onb_1/sla-signature-session/") &&
        url.includes("/status")
      ) {
        return new Response(
          JSON.stringify({
            status: "uploaded",
            uploaded: true,
            fileUrl: "https://cdn.example/sig.png",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.endsWith("/onboarding/onb_1/sla-signature-session")) {
        return new Response(JSON.stringify({ id: "sess_1" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    let formRef: UseFormReturn<ComplianceSettings> | null = null;

    render(
      <ComplianceStepHarness
        onboardingId="onb_1"
        ensureOnboardingId={ensureOnboardingId}
        onFormReady={(form) => {
          formRef = form;
        }}
      />,
    );

    await waitFor(() => {
      expect(formRef?.getValues("slaSignatureSessionId")).toBe("sess_1");
    });

    expect(
      screen.getByText(/Signature received from your phone/i),
    ).toBeInTheDocument();
    expect(setIntervalSpy).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it("retries QR session creation with refreshed onboarding id when stale id fails", async () => {
    const ensureOnboardingId = vi
      .fn()
      .mockResolvedValueOnce("onb_stale")
      .mockResolvedValueOnce("onb_fresh");

    mocks.fetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/onboarding/onb_stale/sla-signature-session")) {
        return new Response(
          JSON.stringify({
            message: "Onboarding session not found or expired",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.endsWith("/onboarding/onb_fresh/sla-signature-session")) {
        return new Response(JSON.stringify({ id: "sess_retry" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/status")) {
        return new Response(
          JSON.stringify({ status: "pending", uploaded: false, fileUrl: null }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(
      <ComplianceStepHarness
        onboardingId="onb_stale"
        ensureOnboardingId={ensureOnboardingId}
        onFormReady={() => {}}
      />,
    );

    await waitFor(() => {
      expect(ensureOnboardingId).toHaveBeenCalledTimes(2);
    });

    expect(ensureOnboardingId).toHaveBeenNthCalledWith(1);
    expect(ensureOnboardingId).toHaveBeenNthCalledWith(2, {
      forceRefresh: true,
    });

    await waitFor(() => {
      expect(screen.getByTestId("qr-code")).toHaveTextContent(
        "onboardingId=onb_fresh",
      );
    });
  });
});
