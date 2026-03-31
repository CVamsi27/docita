"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  FloatingStartConsultation,
  MobileNav,
  Sidebar,
} from "@/features/_shared/components";
import { SmartBackButton } from "@/features/_shared/components/navigation/smart-back-button";
import { useNavigationStore } from "@/lib/stores/navigation-store";
import { CommandPalette } from "@/features/_shared/components/navigation/command-palette";
import { ClinicProvider, useClinic } from "@/lib/clinic-context";
import { NavigationHistoryProvider } from "@/providers/navigation-history-provider";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import type { ImperativePanelHandle } from "@workspace/ui/components/resizable";
import { ErrorBoundaryWrapper } from "@/components/common/error-boundary";
import { useAuth } from "@/lib/auth-context";
import { useAPIQuery } from "@/lib/api-core";
import type { User } from "@workspace/types";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { canAccessTarget } from "@/lib/access-policy";
import { getAccessTargetForPath } from "@/lib/access-routes";
import { usePermissionStore } from "@/lib/stores/permission-store";

const SUBSCRIPTION_ALLOWED_PATHS = ["/upgrade", "/settings", "/login"];
const VERIFICATION_ALLOWED_PATHS = ["/verify-doctor", "/login"];

function DoctorVerificationGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isDoctor = user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR";

  const { data: doctorProfile, isLoading: profileLoading } =
    useAPIQuery<User>(
      ["doctor-profile", user?.id ?? ""],
      `/doctors/${user?.id}`,
      { enabled: !!user?.id && isDoctor, staleTime: 5 * 60 * 1000 },
    );

  useEffect(() => {
    if (!user || !isDoctor || profileLoading) return;
    if (!doctorProfile) return;
    const needsVerification = !doctorProfile.signatureUrl || !doctorProfile.registrationNumber;
    if (
      needsVerification &&
      !VERIFICATION_ALLOWED_PATHS.some((p) => pathname?.startsWith(p))
    ) {
      router.replace("/verify-doctor");
    }
  }, [user, isDoctor, doctorProfile, profileLoading, pathname, router]);

  return <>{children}</>;
}

function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { clinic } = useClinic();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!clinic) return;
    const status = clinic.subscriptionStatus;
    const isExpired = status === "EXPIRED";
    const isBlocked = isExpired;
    if (
      isBlocked &&
      !SUBSCRIPTION_ALLOWED_PATHS.some((p) => pathname?.startsWith(p))
    ) {
      router.replace("/upgrade");
    }
  }, [clinic, pathname, router]);

  return <>{children}</>;
}

function PageAccessGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const { canAccess } = usePermissionStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user?.role || !clinic || !pathname) return;

    const target = getAccessTargetForPath(pathname);
    if (!target) return;

    if (
      target === APP_ACCESS_TARGETS.PAGE_UPGRADE &&
      clinic.subscriptionStatus === "EXPIRED"
    ) {
      return;
    }

    const hasAccess = canAccessTarget(
      target,
      {
        role: user.role,
        canAccessFeature: canAccess,
      },
      "read",
    );

    if (!hasAccess) {
      router.replace("/dashboard");
    }
  }, [canAccess, clinic, pathname, router, user?.role]);

  return <>{children}</>;
}

function MobileHeader() {
  const { canGoBack } = useNavigationStore();
  return (
    <header
      className="flex h-14 items-center gap-2 border-b bg-background px-4 md:hidden"
      aria-label="Mobile navigation"
    >
      <MobileNav />
      {canGoBack() ? (
        <SmartBackButton fallback="/dashboard" label="" className="px-2" />
      ) : (
        <span className="font-bold text-lg">Docita</span>
      )}
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.clinicId) {
      if (user.onboardingStep === "JOINING_CLINIC") {
        router.replace("/join-request-status");
      } else if (user.onboardingStep === "CREATING_CLINIC") {
        router.replace("/onboarding");
      } else {
        router.replace("/choose-path");
      }
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="hidden md:flex w-[18%] min-w-[200px] flex-col border-r p-4 gap-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex flex-col gap-2 mt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b flex items-center px-6 gap-4 md:hidden">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex-1 p-4 md:p-6 flex flex-col gap-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !user.clinicId) return null;

  return (
    <NavigationHistoryProvider>
      <ClinicProvider>
        <DoctorVerificationGuard>
          <SubscriptionGuard>
            <PageAccessGuard>
              <div className="flex h-screen overflow-hidden bg-background">
                <ResizablePanelGroup direction="horizontal">
                  <ResizablePanel
                    ref={sidebarPanelRef}
                    defaultSize={18}
                    minSize={15}
                    maxSize={25}
                    className="hidden md:block"
                    collapsible={true}
                    collapsedSize={4}
                    onCollapse={() => setIsCollapsed(true)}
                    onExpand={() => setIsCollapsed(false)}
                  >
                    <Sidebar
                      isCollapsed={isCollapsed}
                      onCollapsedChange={(collapsed) => {
                        setIsCollapsed(collapsed);
                        if (collapsed) {
                          sidebarPanelRef.current?.collapse();
                        } else {
                          sidebarPanelRef.current?.expand();
                        }
                      }}
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle className="hidden md:flex" />
                  <ResizablePanel defaultSize={82}>
                    <div className="flex h-full flex-col overflow-hidden">
                      <MobileHeader />
                      <main
                        className="flex-1 overflow-y-auto p-4 md:p-6"
                        aria-label="Main content"
                      >
                        <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
                      </main>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
              <FloatingStartConsultation />
              <CommandPalette />
            </PageAccessGuard>
          </SubscriptionGuard>
        </DoctorVerificationGuard>
      </ClinicProvider>
    </NavigationHistoryProvider>
  );
}
