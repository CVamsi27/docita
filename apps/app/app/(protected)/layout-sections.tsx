"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import type { ImperativePanelHandle } from "@workspace/ui/components/layout/resizable";
import { useAuth } from "@/lib/auth/auth-context";
import { persistReturnPathBeforeLogin } from "@/lib/auth/safe-return-path";

export function useProtectedWorkspaceAccess() {
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const { user, isLoading, isApiStarting } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isApiStarting) return;
    if (!user) {
      setRedirectMessage("Your session is missing. Redirecting to login...");
      persistReturnPathBeforeLogin();
      router.replace("/login");
      return;
    }
    if (user.emailVerified === false) {
      setRedirectMessage("Please verify your email before continuing...");
      router.replace("/verify-email-sent");
      return;
    }
    if (!user.clinicId) {
      if (user.onboardingStep === "JOINING_CLINIC") {
        setRedirectMessage("Taking you to your join request status...");
        router.replace("/join-request-status");
      } else if (user.onboardingStep === "CREATING_CLINIC") {
        setRedirectMessage("Taking you back to onboarding...");
        router.replace("/onboarding");
      } else {
        setRedirectMessage("Taking you to facility setup...");
        router.replace("/choose-path");
      }
    }
  }, [isApiStarting, isLoading, user, router]);

  return { user, isLoading, isApiStarting, redirectMessage };
}

export function useSidebarAutoCollapse({
  isLoading,
  isSettingsRoute,
  isConsultationDetailRoute,
  sidebarPanelRef,
  setIsCollapsed,
}: {
  isLoading: boolean;
  isSettingsRoute: boolean;
  isConsultationDetailRoute: boolean;
  sidebarPanelRef: RefObject<ImperativePanelHandle | null>;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
}) {
  const wasSettingsRouteRef = useRef(false);
  const wasConsultationRouteRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    const wasConsultationRoute = wasConsultationRouteRef.current;
    wasConsultationRouteRef.current = isConsultationDetailRoute;

    const id = requestAnimationFrame(() => {
      if (isConsultationDetailRoute && !wasConsultationRoute) {
        sidebarPanelRef.current?.collapse();
        setIsCollapsed(true);
      } else if (!isConsultationDetailRoute && wasConsultationRoute) {
        sidebarPanelRef.current?.expand();
        setIsCollapsed(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [
    isLoading,
    isConsultationDetailRoute,
    sidebarPanelRef,
    setIsCollapsed,
  ]);

  useEffect(() => {
    if (isLoading) return;
    const wasSettingsRoute = wasSettingsRouteRef.current;
    wasSettingsRouteRef.current = isSettingsRoute;

    const id = requestAnimationFrame(() => {
      if (isSettingsRoute && !wasSettingsRoute) {
        sidebarPanelRef.current?.collapse();
        setIsCollapsed(true);
      } else if (!isSettingsRoute && wasSettingsRoute) {
        sidebarPanelRef.current?.expand();
        setIsCollapsed(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isLoading, isSettingsRoute, sidebarPanelRef, setIsCollapsed]);
}

export function WorkspaceLoadingSkeleton() {
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
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
