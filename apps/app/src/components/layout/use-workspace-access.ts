import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useNavigate } from "react-router";
import type { ImperativePanelHandle } from "@workspace/ui/components/layout/resizable";
import { useAuth } from "@/lib/auth/auth-context";
import { persistReturnPathBeforeLogin } from "@/lib/auth/safe-return-path";

export function useProtectedWorkspaceAccess() {
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const { user, isLoading, isApiStarting } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || isApiStarting) return;
    if (!user) {
      setRedirectMessage("Your session is missing. Redirecting to login...");
      persistReturnPathBeforeLogin();
      navigate("/login", { replace: true });
      return;
    }
    if (user.emailVerified === false) {
      setRedirectMessage("Please verify your email before continuing...");
      navigate("/verify-email-sent", { replace: true });
      return;
    }
    if (!user.clinicId) {
      if (user.onboardingStep === "JOINING_CLINIC") {
        setRedirectMessage("Taking you to your join request status...");
        navigate("/join-request-status", { replace: true });
      } else if (user.onboardingStep === "CREATING_CLINIC") {
        setRedirectMessage("Taking you back to onboarding...");
        navigate("/onboarding", { replace: true });
      } else {
        setRedirectMessage("Taking you to facility setup...");
        navigate("/choose-path", { replace: true });
      }
    }
  }, [isApiStarting, isLoading, user, navigate]);

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
  }, [isLoading, isConsultationDetailRoute, sidebarPanelRef, setIsCollapsed]);

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
