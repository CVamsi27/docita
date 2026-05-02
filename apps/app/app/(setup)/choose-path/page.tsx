"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { typedApi } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/lib/auth-context";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";

const CREATE_BULLETS = [
  "Choose subscription plan",
  "Configure facility settings",
  "Invite team members",
  "Sign legal agreements",
];

const JOIN_BULLETS = [
  "Search for your facility",
  "Submit join request",
  "Wait for admin approval",
  "Start working immediately",
];

export default function ChoosePathPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [loadingPath, setLoadingPath] = useState<
    "CREATE_CLINIC" | "JOIN_CLINIC" | null
  >(null);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setRedirectMessage("Redirecting to login…");
      router.replace("/login");
      return;
    }
    if (user?.clinicId || user?.onboardingStep === "COMPLETED") {
      setRedirectMessage("Account already linked. Redirecting to your workspace…");
      router.replace("/today");
      return;
    }
    if (user?.onboardingStep === "CREATING_CLINIC") {
      setRedirectMessage("Taking you back to onboarding…");
      router.replace("/onboarding");
    }
  }, [isAuthenticated, isLoading, user, router]);

  const handleChoosePath = async (path: "CREATE_CLINIC" | "JOIN_CLINIC") => {
    setLoadingPath(path);
    try {
      await typedApi.onboarding.choosePath(path);
      await refreshUser();
      router.push(path === "CREATE_CLINIC" ? "/onboarding" : "/join-clinic");
    } catch (error) {
      showUserFacingErrorToast(
        "We could not save this selection. Please try again.",
      );
      logger.error("Error choosing path", { error });
      setLoadingPath(null);
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background px-4"
        role="status"
        aria-live="polite"
        aria-label="Checking your session"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-10 w-10 text-muted-foreground"
        />
      </div>
    );
  }

  if (redirectMessage) {
    return (
      <PageTransitionLoader
        title="Redirecting…"
        description={redirectMessage}
      />
    );
  }

  const firstName = user?.name?.split(" ")[0];

  return (
    <PreDashboardShell
      currentStep="choose-path"
      contentMaxWidth="max-w-xl"
      showSignOut
    >
      <div className="ui-copy-stack text-center lg:text-left">
        <h1 className="ui-page-title">
          {firstName ? `Welcome, ${firstName}!` : "Welcome to Docita!"}
        </h1>
        <p className="ui-page-subtitle">
          How would you like to get started?
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <PathCard
          icon={<Building2 className="h-7 w-7 text-primary" />}
          iconBg="border border-border/70 bg-background/70"
          title="Create New Facility"
          description="Set up your own facility and choose a plan"
          bullets={CREATE_BULLETS}
          buttonLabel="Get Started"
          buttonVariant="default"
          loading={loadingPath === "CREATE_CLINIC"}
          disabled={loadingPath !== null}
          onClick={() => handleChoosePath("CREATE_CLINIC")}
          highlight
        />

        <PathCard
          icon={<Users className="h-7 w-7 text-info" />}
          iconBg="border border-border/70 bg-background/70"
          title="Join Existing Facility"
          description="Request access to a facility in your organization"
          bullets={JOIN_BULLETS}
          buttonLabel="Search Facilities"
          buttonVariant="outline"
          loading={loadingPath === "JOIN_CLINIC"}
          disabled={loadingPath !== null}
          onClick={() => handleChoosePath("JOIN_CLINIC")}
        />
      </div>
    </PreDashboardShell>
  );
}

interface PathCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  bullets: string[];
  buttonLabel: string;
  buttonVariant: "default" | "outline";
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  highlight?: boolean;
}

function PathCard({
  icon,
  iconBg,
  title,
  description,
  bullets,
  buttonLabel,
  buttonVariant,
  loading,
  disabled,
  onClick,
  highlight,
}: PathCardProps) {
  return (
    <div
      className={cn(
        "ui-card-surface group relative flex flex-col p-6 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md",
        highlight
          ? "border-primary/30 hover:border-primary"
          : "border-border/70 hover:border-border",
        disabled && "pointer-events-none opacity-70",
      )}
    >
      <div className="space-y-4 flex-1">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            iconBg,
          )}
        >
          {icon}
        </div>

        <div className="ui-copy-stack">
          <h2 className="ui-section-title text-[var(--fs-lg)]">{title}</h2>
          <p className="ui-helper-text">{description}</p>
        </div>

        <ul className="space-y-1.5">
          {bullets.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 ui-helper-text"
            >
              <Check className="h-3.5 w-3.5 text-success shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant={buttonVariant}
        className="w-full mt-6"
        onClick={onClick}
        disabled={disabled}
      >
        {loading ? <DocitaLoadingIndicator variant="inline" decorative /> : buttonLabel}
      </Button>
    </div>
  );
}
