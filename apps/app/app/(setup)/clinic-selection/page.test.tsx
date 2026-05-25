import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClinicSelectionPage from "./page";

const mocks = vi.hoisted(() => ({
  router: {
    replace: vi.fn(),
  },
  auth: {
    user: {
      id: "user-1",
      emailVerified: false,
      clinicId: null,
    },
    isLoading: false,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/components/loaders/page-transition-loader", () => ({
  PageTransitionLoader: () => <div data-testid="page-transition-loader" />,
}));

describe("ClinicSelectionPage", () => {
  beforeEach(() => {
    mocks.router.replace.mockReset();
    mocks.auth = {
      user: {
        id: "user-1",
        emailVerified: false,
        clinicId: null,
      },
      isLoading: false,
    };
  });

  it("redirects unverified users to verification", async () => {
    render(<ClinicSelectionPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/verify-email-sent");
    });
  });
});
