import { describe, expect, it, vi } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router";
import { render, screen } from "@testing-library/react";
import { SettingsDangerZonePage } from "./settings-danger-zone-page";

// The component translates under the dot-namespaced `Patients.dangerZone`
// keys, which the global en.json-backed i18n mock does not resolve (it treats
// the namespace as a top-level key). Provide a local mock for the section copy.
const dangerZoneCopy: Record<string, string> = {
  signOutTitle: "Sign out",
  signOutDescription: "Sign out of your Docita account on this device.",
  signOutButton: "Sign out",
  signOutConfirmTitle: "Sign out",
  signOutConfirmDescription: "Are you sure you want to sign out of your account?",
  signOutConfirmAction: "Sign out",
  cancelAction: "Cancel",
  deleteTitle: "Delete account",
  deleteDescription:
    "Request permanent closure of your staff account and removal of personal data associated with it, subject to legal and clinical retention requirements.",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => dangerZoneCopy[key] ?? key,
  }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    logout: vi.fn(),
    user: { id: "user-1" },
    isLoading: false,
    isAdmin: false,
  }),
}));

vi.mock("@/hooks/use-confirm", () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

vi.mock("@workspace/data-access", async () => {
  const actual = await vi.importActual<typeof import("@workspace/data-access")>(
    "@workspace/data-access",
  );
  return {
    ...actual,
    useRequestStaffAccountDeletion: () => ({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    }),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <HelmetProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </HelmetProvider>,
  );
}

describe("SettingsDangerZonePage", () => {
  it("renders the page title and description", () => {
    renderWithProviders(<SettingsDangerZonePage />);
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sign out of this workspace or request deletion of your account.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the sign-out and account-deletion sections", () => {
    renderWithProviders(<SettingsDangerZonePage />);
    // The sign-out copy appears on the card title, the confirm dialog, and
    // the action button, so assert counts rather than a single match.
    expect(screen.getAllByText("Sign out").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Delete account")).toBeInTheDocument();
  });
});
