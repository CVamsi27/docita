import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test-utils";

// The shared vitest.setup mock is en-only and stubs changeLanguage away, so
// it cannot exercise the real language switch. This spec deliberately uses
// the REAL react-i18next + the app's actual i18n init to reproduce the
// reported "EN/हिंदी switcher is not working" behavior.
vi.unmock("react-i18next");

describe("LocaleSwitcher with the real i18next instance", () => {
  it("re-renders translated strings when Hindi is selected, then back to English", async () => {
    window.localStorage.removeItem("docita_locale");

    const { useTranslation } = await import("react-i18next");
    const { default: i18n } = await import("@/i18n/index");
    const { I18nProvider } = await import("@/i18n/provider");
    const { LocaleSwitcher } = await import("./locale-switcher");

    function Probe() {
      const { t } = useTranslation("Auth");
      return <p data-testid="probe">{t("signIn.welcomeTitle")}</p>;
    }

    render(
      <I18nProvider>
        <LocaleSwitcher />
        <Probe />
      </I18nProvider>,
    );

    // Starts in English (default locale, no stored preference).
    expect(i18n.resolvedLanguage).toBe("en");
    expect(screen.getByTestId("probe")).toHaveTextContent(
      "Welcome to Docita",
    );

    // Switch to Hindi.
    fireEvent.click(screen.getByRole("button", { name: "हिंदी" }));

    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe("hi");
      expect(screen.getByTestId("probe")).toHaveTextContent(
        "Docita में आपका स्वागत है",
      );
    });
    expect(window.localStorage.getItem("docita_locale")).toBe("hi");

    // Switch back to English.
    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe("en");
      expect(screen.getByTestId("probe")).toHaveTextContent(
        "Welcome to Docita",
      );
    });
  });

  it("switches the auth shell chrome (branding + footer) to Hindi", async () => {
    // Regression pin for the reported "EN/हिंदी not working" symptom: the
    // login page shell (branding hero, assurance items, help footer) must
    // visibly switch, not just the switcher's own aria-pressed state.
    window.localStorage.removeItem("docita_locale");

    const { default: i18n } = await import("@/i18n/index");
    const { I18nProvider } = await import("@/i18n/provider");
    const { LocaleSwitcher } = await import("./locale-switcher");
    const { AuthBrandingPanel } = await import(
      "@/features/auth/components/AuthBrandingPanel"
    );
    const { AuthPreDashboardFooter } = await import(
      "@/features/auth/components/AuthPreDashboardFooter"
    );

    render(
      <I18nProvider>
        <LocaleSwitcher />
        <AuthBrandingPanel currentStep="login" />
        <AuthPreDashboardFooter />
      </I18nProvider>,
    );

    expect(
      screen.getByText(
        "Sign in to manage appointments, patients, billing, and clinical workflows",
      ),
    ).toBeInTheDocument();
    // Assurance items render in both the branding panel and the footer.
    expect(screen.getAllByText("Encrypted sessions").length).toBeGreaterThan(0);
    expect(screen.getByText("Need help")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "हिंदी" }));

    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe("hi");
      expect(
        screen.getByText(
          "अपॉइंटमेंट, मरीज़, बिलिंग और क्लिनिकल वर्कफ़्लो प्रबंधित करने के लिए साइन इन करें",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getAllByText("एन्क्रिप्टेड सत्र").length,
      ).toBeGreaterThan(0);
      expect(screen.getByText("सहायता चाहिए")).toBeInTheDocument();
    });
  });

  it("switches the patient portal OTP login to Hindi", async () => {
    // The en-only test mock returns raw keys for bad key paths, so it cannot
    // catch a wrong namespace/key on the portal login; boot the real instance
    // and assert the actual Hindi copy renders.
    window.localStorage.removeItem("docita_locale");

    const { default: i18n } = await import("@/i18n/index");
    // Tests in this file share the singleton instance; an earlier test may
    // have left it in Hindi, so start this one from a clean English state.
    await i18n.changeLanguage("en");
    const { I18nProvider } = await import("@/i18n/provider");
    const { LocaleSwitcher } = await import("./locale-switcher");
    const { PortalOtpLoginUI } = await import(
      "@/features/patient-portal/components/auth/portal-otp-login-ui"
    );

    render(
      <I18nProvider>
        <LocaleSwitcher />
        <PortalOtpLoginUI />
      </I18nProvider>,
    );

    expect(screen.getByText("Patient Portal")).toBeInTheDocument();
    expect(screen.getByText("Mobile Number")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "हिंदी" }));

    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe("hi");
      expect(screen.getByText("पेशेंट पोर्टल")).toBeInTheDocument();
      expect(screen.getByText("मोबाइल नंबर")).toBeInTheDocument();
      expect(screen.getByText("कोड भेजें")).toBeInTheDocument();
    });
  });
});
