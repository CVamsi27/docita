import type { ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedLayout from "./layout";

vi.mock("@workspace/ui/components/tooltip", () => ({
  SymbolTooltip: ({ children }: { children: ReactElement }) => children,
}));

const mocks = vi.hoisted(() => ({
  router: {
    replace: vi.fn(),
  },
  pathname: "/dashboard",
  auth: {
    user: {
      id: "user-1",
      clinicId: "clinic-1",
      emailVerified: false,
      onboardingStep: "COMPLETED",
      role: "ADMIN",
    },
    isLoading: false,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/features/_shared/components", () => ({
  FloatingStartConsultation: () => null,
  RealtimeProviders: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Sidebar: () => null,
  SidebarMobileTrigger: () => null,
  AskAiProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  AskAiOverlay: () => null,
}));

vi.mock("@/components/common/navigation/back-button", () => ({
  BackButton: () => null,
}));

vi.mock("@/hooks/use-can-go-back", () => ({
  useCanGoBack: () => false,
}));

vi.mock("@/features/_shared/components/navigation/command-palette", () => ({
  CommandPalette: () => null,
}));

vi.mock("@/features/_shared/components/layout/desktop-top-bar", () => ({
  DesktopTopBar: () => <div data-testid="desktop-top-bar" />,
}));

vi.mock("@/providers/navigation-history-provider", () => ({
  NavigationHistoryProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  readInAppNavCount: () => 0,
  readInAppNavEntry: () => null,
}));

vi.mock("@/lib/contexts/clinic-context", () => ({
  ClinicProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useClinic: () => ({ clinic: null }),
}));

vi.mock("@/components/common/error-boundary", () => ({
  ErrorBoundaryWrapper: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/common/loaders/page-transition-loader", () => ({
  PageTransitionLoader: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div data-testid="page-transition-loader">
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: () => ({
    canAccess: () => true,
  }),
}));

vi.mock("@/lib/api/api-core", () => ({
  useAPIQuery: () => ({ data: null, isLoading: false, isFetching: false, isError: false }),
}));

vi.mock("@/lib/access-control/access-policy", () => ({
  canAccessTarget: () => true,
}));

vi.mock("@/lib/access-control/access-routes", () => ({
  getAccessTargetForPath: () => null,
}));

vi.mock("@workspace/ui/components/resizable", () => ({
  ResizableHandle: () => null,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@workspace/ui/components/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

vi.mock("@workspace/ui/components/skeleton", () => ({
  Skeleton: () => null,
}));

vi.mock("@workspace/ui/components/docita-logo", () => ({
  DocitaLogo: () => null,
}));

describe("ProtectedLayout", () => {
  beforeEach(() => {
    mocks.router.replace.mockReset();
    mocks.pathname = "/dashboard";
    mocks.auth = {
      user: {
        id: "user-1",
        clinicId: "clinic-1",
        emailVerified: false,
        onboardingStep: "COMPLETED",
        role: "ADMIN",
      },
      isLoading: false,
    };
  });

  it("redirects unverified users to verification before loading workspace chrome", async () => {
    render(
      <ProtectedLayout>
        <div>child</div>
      </ProtectedLayout>,
    );

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/verify-email-sent");
    });

    expect(
      screen.getByTestId("page-transition-loader"),
    ).toHaveTextContent("Redirecting…");
  });

  it("shows the desktop top bar on the consultation dashboard route", async () => {
    mocks.pathname = "/consultation";
    mocks.auth.user.emailVerified = true;

    render(
      <ProtectedLayout>
        <div>child</div>
      </ProtectedLayout>,
    );

    expect(screen.getByTestId("desktop-top-bar")).toBeInTheDocument();
  });
});
