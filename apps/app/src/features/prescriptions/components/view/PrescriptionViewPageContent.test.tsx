import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PrescriptionViewPageContent } from "./PrescriptionViewPageContent";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

const query = vi.hoisted(() => ({
  error: new Error("unavailable"),
  refetch: vi.fn(),
}));
vi.mock("@workspace/data-access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@workspace/data-access")>()),
  usePrescription: () => ({ data: undefined, isLoading: false, ...query }),
  useResendPrescriptionWhatsApp: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));
vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/contexts/clinic-context", () => ({
  useClinic: () => ({ clinic: null }),
}));
vi.mock("@/components/auth/use-feature", () => ({ useFeature: () => true }));
vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: vi.fn(),
}));

describe("Prescription read failure", () => {
  beforeEach(() => {
    query.refetch.mockClear();
    vi.mocked(showUserFacingErrorToast).mockClear();
  });

  it("keeps a named page and inline retry without sending toasts from render", () => {
    const client = new QueryClient();
    const page = (
      <QueryClientProvider client={client}>
        <PrescriptionViewPageContent />
      </QueryClientProvider>
    );
    const { rerender } = render(page);
    expect(
      screen.getByRole("heading", { level: 1, name: "Prescription" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not load this prescription",
    );
    expect(
      screen.queryByText("Prescription not found"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(query.refetch).toHaveBeenCalledTimes(1);
    rerender(page);
    expect(showUserFacingErrorToast).not.toHaveBeenCalled();
  });
});
