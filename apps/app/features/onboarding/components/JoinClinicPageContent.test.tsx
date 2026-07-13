import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "@/test-utils/render-with-tooltip";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/join-clinic",
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Test Doctor", role: "DOCTOR" },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock("@/components/layout/theme-toggle-with-appearance-sync", () => ({
  ThemeToggleWithAppearanceSync: () => null,
}));

vi.mock("@/components/loaders/page-transition-loader", () => ({
  PageTransitionLoader: () => <div data-testid="page-transition-loader" />,
}));

const mocks = vi.hoisted(() => ({
  searchQuery: "central clinic",
  setSearchQuery: vi.fn(),
  clinics: [] as Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    canJoin: boolean;
    existingRequestStatus: string | null;
  }>,
  isSearching: false,
  selectedClinic: null,
  setSelectedClinic: vi.fn(),
  requestedRole: "DOCTOR",
  setRequestedRole: vi.fn(),
  message: "",
  setMessage: vi.fn(),
  isSubmitting: false,
  isRedirecting: false,
  handleSearch: vi.fn(),
  handleSubmitRequest: vi.fn(),
  handleSearchKeyPress: vi.fn(),
}));

vi.mock("@/features/onboarding/hooks/use-join-clinic-page", () => ({
  useJoinClinicPage: () => ({
    searchQuery: mocks.searchQuery,
    setSearchQuery: mocks.setSearchQuery,
    clinics: mocks.clinics,
    isSearching: mocks.isSearching,
    selectedClinic: mocks.selectedClinic,
    setSelectedClinic: mocks.setSelectedClinic,
    requestedRole: mocks.requestedRole,
    setRequestedRole: mocks.setRequestedRole,
    message: mocks.message,
    setMessage: mocks.setMessage,
    isSubmitting: mocks.isSubmitting,
    isRedirecting: mocks.isRedirecting,
    handleSearch: mocks.handleSearch,
    handleSubmitRequest: mocks.handleSubmitRequest,
    handleSearchKeyPress: mocks.handleSearchKeyPress,
  }),
}));

vi.mock("@/features/onboarding/components/join-clinic-search-results", () => ({
  JoinClinicSearchResults: () => null,
}));

vi.mock("@/features/onboarding/components/join-clinic-request-dialog", () => ({
  JoinClinicRequestDialog: () => null,
}));

import JoinClinicPageContent from "./JoinClinicPageContent";

describe("JoinClinicPageContent empty state", () => {
  beforeEach(() => {
    mocks.searchQuery = "central clinic";
    mocks.clinics = [];
    mocks.isSearching = false;
    mocks.isRedirecting = false;
  });

  it("renders the actionable empty state when a search returns no clinics", () => {
    render(<JoinClinicPageContent />);

    expect(
      screen.getByText(/No facilities matched/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/central clinic/i),
    ).toBeInTheDocument();
  });

  it("offers a link back to the choose-path page so the user can pivot to creating a facility", () => {
    render(<JoinClinicPageContent />);

    const switchLink = screen.getByRole("link", {
      name: /Create new facility/i,
    });
    expect(switchLink).toHaveAttribute("href", "/choose-path");
  });

  it("offers a contact escape hatch for users who cannot reach their admin", () => {
    render(<JoinClinicPageContent />);

    const contactLink = screen.getByRole("link", {
      name: /Contact Docita/i,
    });
    expect(contactLink).toHaveAttribute("href", "/contact");
  });
});
