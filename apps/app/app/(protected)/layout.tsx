"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AskAiOverlay,
  AskAiProvider,
  FloatingStartConsultation,
  RealtimeProviders,
  Sidebar,
  SidebarMobileTrigger,
} from "@/features/_shared/components";
import { BackButton } from "@/components/common/navigation/back-button";
import { useCanGoBack } from "@/hooks/use-can-go-back";
import { CommandPalette } from "@/features/_shared/components/navigation/command-palette";
import { DesktopTopBar } from "@/features/_shared/components/layout/desktop-top-bar";
import { ClinicProvider, useClinic } from "@/lib/contexts/clinic-context";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import type { ImperativePanelHandle } from "@workspace/ui/components/resizable";
import { ErrorBoundaryWrapper } from "@/components/common/error-boundary";
import { useAuth } from "@/lib/auth/auth-context";
import { useAPIQuery } from "@/lib/api/api-core";
import type { TierName, User } from "@workspace/types";
import { APP_ACCESS_TARGETS, SUBSCRIPTION_TRIAL_DAYS } from "@workspace/types";
import { ThemeToggleWithAppearanceSync } from "@/features/_shared/components/layout/theme-toggle-with-appearance-sync";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import {
  AlertTriangle,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { getTierInfo } from "@/lib/tier-config";
import { formatDate } from "@/lib/formatters";
import { getAccessTargetForPath } from "@/lib/access-control/access-routes";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import {
  getTrialState,
  isBillingAdminRole,
  isPastSubscriptionGraceDeadline,
} from "@/lib/subscription/subscription-lockout";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import { FeatureFlagsProvider } from "@/features/_shared/hooks/use-feature-flag";
import { persistReturnPathBeforeLogin } from "@/lib/auth/safe-return-path";

const SUBSCRIPTION_ALLOWED_PATHS = ["/settings", "/login", "/billing-locked"];
const VERIFICATION_ALLOWED_PATHS = ["/verify-doctor", "/login"];

function DoctorVerificationGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isDoctor = user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR";
  const isVerificationAllowedPath = VERIFICATION_ALLOWED_PATHS.some((p) =>
    pathname?.startsWith(p),
  );

  const {
    data: doctorProfile,
    isLoading: profileLoading,
    isFetching: profileFetching,
    isError: profileError,
  } = useAPIQuery<User>(
    ["doctor-profile", user?.id ?? ""],
    `/doctors/${user?.id}`,
    { enabled: !!user?.id && isDoctor, staleTime: 5 * 60 * 1000 },
  );

  const needsVerification =
    !!doctorProfile &&
    (!doctorProfile.signatureUrl || !doctorProfile.registrationNumber);

  const shouldRedirectToVerify =
    !!user && isDoctor && needsVerification && !isVerificationAllowedPath;

  useEffect(() => {
    if (!user || !isDoctor || profileLoading) return;
    if (!doctorProfile) return;
    if (shouldRedirectToVerify) {
      router.replace("/verify-doctor");
    }
  }, [
    user,
    isDoctor,
    doctorProfile,
    profileLoading,
    router,
    shouldRedirectToVerify,
  ]);

  const isCheckingVerification =
    !!user &&
    isDoctor &&
    !isVerificationAllowedPath &&
    !profileError &&
    (profileLoading || (profileFetching && !doctorProfile));

  if (isCheckingVerification || shouldRedirectToVerify) {
    return (
      <PageTransitionLoader
        title="Checking your profile…"
        description="Verifying your doctor profile before loading your workspace"
      />
    );
  }

  return <>{children}</>;
}

function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { clinic } = useClinic();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!clinic) return;
    const pastGrace = isPastSubscriptionGraceDeadline(clinic);
    const billingAdmin = isBillingAdminRole(user?.role);
    const trialState = getTrialState(clinic);
    const trialFullyExpired = trialState === "EXPIRED";

    if (
      (pastGrace || trialFullyExpired) &&
      !billingAdmin &&
      !pathname?.startsWith("/billing-locked") &&
      !pathname?.startsWith("/login")
    ) {
      router.replace("/billing-locked");
      return;
    }

    const status = clinic.subscriptionStatus;
    const isExpired = status === "EXPIRED";
    const isBlocked = isExpired || trialFullyExpired;
    if (
      isBlocked &&
      !SUBSCRIPTION_ALLOWED_PATHS.some((p) => pathname?.startsWith(p))
    ) {
      router.replace(SUBSCRIPTION_SETTINGS_PATH);
    }
  }, [clinic, pathname, router, user?.role]);

  return <>{children}</>;
}

function PageAccessGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const { canAccess, canAccessTier, workspaceProfile } = usePermissionStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user?.role || !clinic || !pathname) return;

    const target = getAccessTargetForPath(pathname);
    if (!target) {
      router.replace("/today");
      return;
    }

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
        canAccessTier,
        workspaceProfile,
      },
      "read",
    );

    if (!hasAccess) {
      router.replace("/today");
    }
  }, [
    canAccess,
    canAccessTier,
    clinic,
    pathname,
    router,
    user?.role,
    workspaceProfile,
  ]);

  return <>{children}</>;
}

function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const canGoBack = useCanGoBack();
  const isConsultationDetailRoute = Boolean(
    pathname && /^\/consultation\/[^/]+/.test(pathname),
  );
  return (
    <header
      className="flex h-14 items-center gap-2 border-b bg-background px-3 md:hidden"
      aria-label="Mobile navigation"
    >
      <SidebarMobileTrigger onClick={onMenuClick} />
      {isConsultationDetailRoute ? (
        <div className="min-w-0 flex-1" aria-hidden="true" />
      ) : canGoBack ? (
        <BackButton fallback="/today" iconOnly className="px-2" />
      ) : (
        <div className="flex h-10 items-center">
          <DocitaLogo />
        </div>
      )}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggleWithAppearanceSync />
      </div>
    </header>
  );
}

function SubscriptionLockNotice() {
  const { clinic } = useClinic();
  const router = useRouter();
  const status = clinic?.subscriptionStatus;

  if (!status || status === "ACTIVE") {
    return null;
  }

  const isExpired = status === "EXPIRED";
  const isGrace = status === "GRACE";
  const isPastDue = status === "PAST_DUE";
  const isPaused = status === "PAUSED";
  const isTrialing = status === "TRIALING";
  const trialState = getTrialState(clinic);
  const isTrialGrace = trialState === "GRACE";
  const trialTierLabel =
    clinic?.tier && typeof clinic.tier === "string"
      ? getTierInfo(clinic.tier as TierName).name
      : "subscription";
  const trialEnd = clinic?.trialEndsAt ? new Date(clinic.trialEndsAt) : null;
  const trialEndText =
    trialEnd && Number.isFinite(trialEnd.getTime())
      ? formatDate(trialEnd)
      : null;
  const trialDaysLeft =
    isTrialing && trialEnd && Number.isFinite(trialEnd.getTime())
      ? Math.max(
          0,
          Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        )
      : null;
  const trialGraceDaysLeft = (() => {
    if (!isTrialGrace || !trialEnd || !Number.isFinite(trialEnd.getTime())) {
      return null;
    }
    const graceEnds = trialEnd.getTime() + 3 * 24 * 60 * 60 * 1000;
    return Math.max(
      0,
      Math.ceil((graceEnds - Date.now()) / (1000 * 60 * 60 * 24)),
    );
  })();
  const graceUntilRaw = clinic?.subscriptionGraceUntil;
  const graceUntil =
    graceUntilRaw !== undefined && graceUntilRaw !== null
      ? new Date(graceUntilRaw)
      : null;
  const graceUntilText =
    graceUntil && Number.isFinite(graceUntil.getTime())
      ? formatDate(graceUntil)
      : null;
  const pastGraceDeadline = clinic
    ? isPastSubscriptionGraceDeadline(clinic)
    : false;
  const title = isExpired
    ? "Subscription Expired: Workspace Locked"
    : isPaused
      ? "Subscription Paused"
      : isGrace || isPastDue
        ? "Payment Grace Period: Access Restricted"
        : isTrialGrace
          ? "Trial ended — payment required"
          : isTrialing
            ? trialDaysLeft !== null && trialDaysLeft <= 3
              ? "Trial ending soon"
              : "Trial active: payment not completed"
            : "Payment required";
  const description = isExpired
    ? "This facility is locked until payment is completed. You can still open billing under Settings, Subscription to restore access."
    : isGrace || isPastDue
      ? `${isPastDue ? "Your payment is overdue." : "Payment is still unresolved."}${graceUntilText && !pastGraceDeadline ? ` Resolve by ${graceUntilText} or staff access may pause until a billing admin completes payment under Settings, Subscription.` : " Resolve payment now to keep Docita access active."}`
      : isPaused
        ? "This subscription is paused. Resolve billing to restore full access."
        : isTrialGrace
          ? `Your free trial has ended${trialGraceDaysLeft !== null ? `. You have ${trialGraceDaysLeft} day${trialGraceDaysLeft === 1 ? "" : "s"} to complete payment` : ""} before access is blocked. Open Settings → Subscription to pay now.`
          : isTrialing
            ? `${trialTierLabel} plan: ${trialDaysLeft !== null ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your trial` : "trial active"}${trialEndText ? ` (ends ${trialEndText})` : ""}. Your trial includes a ${SUBSCRIPTION_TRIAL_DAYS}-day evaluation period. Add payment before the trial ends to avoid entering a payment grace period.`
            : "Your subscription needs billing attention. Resolve payment to keep Docita access active.";

  return (
    <div className="border-b bg-background px-4 py-3 md:px-6">
      <Alert
        variant={isExpired || isTrialGrace ? "destructive" : "default"}
        className={
          isExpired || isTrialGrace
            ? undefined
            : isTrialing
              ? "border-info/40 bg-info/10"
              : "border-warning/40 bg-warning/10"
        }
      >
        {isExpired || isTrialGrace ? (
          <LockKeyhole className="h-4 w-4" />
        ) : (
          <AlertTriangle
            className={
              isTrialing ? "h-4 w-4 text-info" : "h-4 w-4 text-warning"
            }
          />
        )}
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{description}</span>
          <Button
            size="sm"
            variant={isExpired || isTrialGrace ? "secondary" : "outline"}
            onClick={() => router.push(SUBSCRIPTION_SETTINGS_PATH)}
            className="self-start sm:self-auto"
          >
            {isTrialGrace
              ? "Pay now"
              : isTrialing
                ? "Billing & subscription"
                : "Resolve Payment"}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const wasSettingsAutoCollapseRouteRef = useRef(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isSettingsRoute = pathname?.startsWith("/settings") ?? false;
  const isConsultationDetailRoute = Boolean(
    pathname && /^\/consultation\/[^/]+/.test(pathname),
  );

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setRedirectMessage("Your session is missing. Redirecting to login…");
      persistReturnPathBeforeLogin();
      router.replace("/login");
      return;
    }
    if (user.emailVerified === false) {
      setRedirectMessage("Please verify your email before continuing…");
      router.replace("/verify-email-sent");
      return;
    }
    if (!user.clinicId) {
      if (user.onboardingStep === "JOINING_CLINIC") {
        setRedirectMessage("Taking you to your join request status…");
        router.replace("/join-request-status");
      } else if (user.onboardingStep === "CREATING_CLINIC") {
        setRedirectMessage("Taking you back to onboarding…");
        router.replace("/onboarding");
      } else {
        setRedirectMessage("Taking you to facility setup…");
        router.replace("/choose-path");
      }
    }
  }, [isLoading, user, router]);

  // Consultation detail: collapse after the resizable shell exists (avoids a no-op during auth loading).
  useEffect(() => {
    if (isLoading || !isConsultationDetailRoute) return;
    const id = requestAnimationFrame(() => {
      sidebarPanelRef.current?.collapse();
      setIsCollapsed(true);
    });
    return () => cancelAnimationFrame(id);
  }, [isLoading, pathname, isConsultationDetailRoute]);

  useEffect(() => {
    if (isLoading) return;
    const wasSettingsAutoCollapseRoute =
      wasSettingsAutoCollapseRouteRef.current;
    wasSettingsAutoCollapseRouteRef.current = isSettingsRoute;

    if (isSettingsRoute && !wasSettingsAutoCollapseRoute) {
      const id = requestAnimationFrame(() => {
        sidebarPanelRef.current?.collapse();
        setIsCollapsed(true);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isLoading, isSettingsRoute]);

  if (isLoading) {
    return (
      <div
        className="flex h-screen overflow-hidden bg-background"
        role="status"
        aria-live="polite"
        aria-label="Loading workspace"
      >
        <div className="hidden md:flex w-[18%] min-w-[200px] flex-col border-r p-4 gap-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex flex-col gap-2 mt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-9 w-full rounded-md"
              />
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
                <Skeleton
                  key={i}
                  className="h-28 rounded-lg"
                />
              ))}
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (redirectMessage || !user || !user.clinicId) {
    return (
      <PageTransitionLoader
        title="Redirecting…"
        description={redirectMessage ?? "Preparing your workspace…"}
      />
    );
  }

  return (
    <RealtimeProviders>
      <ClinicProvider>
        <FeatureFlagsProvider>
        <DoctorVerificationGuard>
          <SubscriptionGuard>
            <PageAccessGuard>
             <AskAiProvider>
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
                    style={{
                      transition: isDragging
                        ? "none"
                        : "flex 220ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
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
                      mobileOpen={mobileOpen}
                      onMobileOpenChange={setMobileOpen}
                    />
                  </ResizablePanel>
                  <div className="relative hidden md:flex overflow-visible">
                    <ResizableHandle onDragging={setIsDragging} />
                    <SymbolTooltip
                      label={
                        isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                      }
                      side="right"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-7 left-1/2 z-30 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted-foreground shadow-none transition-colors hover:cursor-pointer hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !isCollapsed;
                          setIsCollapsed(next);
                          if (next) {
                            sidebarPanelRef.current?.collapse();
                          } else {
                            sidebarPanelRef.current?.expand();
                          }
                        }}
                        aria-label={
                          isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                        }
                      >
                        {isCollapsed ? (
                          <PanelLeftOpen className="h-3 w-3 shrink-0" />
                        ) : (
                          <PanelLeftClose className="h-3 w-3 shrink-0" />
                        )}
                      </Button>
                    </SymbolTooltip>
                  </div>
                  <ResizablePanel defaultSize={82}>
                    <div className="flex h-full flex-col overflow-hidden">
                      <MobileHeader onMenuClick={() => setMobileOpen(true)} />
                      {!isConsultationDetailRoute ? <DesktopTopBar /> : null}
                      {!isConsultationDetailRoute ? (
                        <SubscriptionLockNotice />
                      ) : null}
                      <main
                        className={
                          isConsultationDetailRoute
                            ? "flex-1 overflow-hidden"
                            : "flex-1 overflow-y-auto p-4 md:p-6"
                        }
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
              <AskAiOverlay />
             </AskAiProvider>
            </PageAccessGuard>
          </SubscriptionGuard>
        </DoctorVerificationGuard>
        </FeatureFlagsProvider>
      </ClinicProvider>
    </RealtimeProviders>
  );
}
