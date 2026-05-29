import type { ReactElement, ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataAccessProvider } from "@workspace/data-access";
import ProtectedLayout from "./layout";

function withDataAccess(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return (
    <DataAccessProvider
      config={{
        fetcher: () => Promise.resolve({ ok: true } as never),
        getClinicId: () => "clinic-1",
        getClinicTimezone: () => "UTC",
        isTierFeatureEnabled: () => true,
      }}
    >
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </DataAccessProvider>
  );
}

vi.mock("@workspace/ui/components/overlay/tooltip", () => ({
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

vi.mock("@/components", () => ({
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

vi.mock("@/components/navigation/back-button", () => ({
  BackButton: () => null,
}));

vi.mock("@/hooks/use-can-go-back", () => ({
  useCanGoBack: () => false,
}));

vi.mock("@/components/navigation/command-palette", () => ({
  CommandPalette: () => null,
}));

vi.mock("@/components/ask-ai/ask-ai-context", () => ({
  AskAiProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAskAi: () => ({ openOverlay: vi.fn(), closeOverlay: vi.fn() }),
}));

vi.mock("@/components/layout/top-bar-actions", () => ({
  TopBarActions: () => null,
  openCommandPaletteFromUi: vi.fn(),
}));

vi.mock("@/components/layout/desktop-top-bar", () => ({
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

vi.mock("@/components/errors/error-boundary", () => ({
  ErrorBoundaryWrapper: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/loaders/page-transition-loader", () => ({
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

vi.mock("@workspace/ui/components/layout/resizable", () => ({
  ResizableHandle: () => null,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@workspace/ui/components/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

vi.mock("@workspace/ui/components/feedback/skeleton", () => ({
  Skeleton: () => null,
}));

vi.mock("@workspace/ui/components/indicators/docita-logo", () => ({
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
      withDataAccess(
        <ProtectedLayout>
          <div>child</div>
        </ProtectedLayout>,
      ),
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
      withDataAccess(
        <ProtectedLayout>
          <div>child</div>
        </ProtectedLayout>,
      ),
    );

    expect(screen.getByTestId("desktop-top-bar")).toBeInTheDocument();
  });
});
