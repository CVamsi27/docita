"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { typedApi } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/lib/auth-context";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import { SupportContact } from "@/components/common/support-contact";
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
      setRedirectMessage("Redirecting to login...");
      router.replace("/login");
      return;
    }
    if (user?.clinicId || user?.onboardingStep === "COMPLETED") {
      setRedirectMessage("Account already linked. Redirecting to dashboard...");
      router.replace("/dashboard");
      return;
    }
    if (user?.onboardingStep === "CREATING_CLINIC") {
      setRedirectMessage("Taking you back to onboarding...");
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (redirectMessage) {
    return (
      <PageTransitionLoader
        title="Redirecting..."
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
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-1 text-center lg:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {firstName ? `Welcome, ${firstName}!` : "Welcome to Docita!"}
        </h1>
        <p className="text-muted-foreground text-sm">
          How would you like to get started?
        </p>
      </div>

      <div
        className="grid sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "100ms" }}
      >
        <PathCard
          icon={<Building2 className="h-7 w-7 text-primary" />}
          iconBg="bg-primary/10"
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
          iconBg="bg-info/10"
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

      <SupportContact />
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
        "group relative flex flex-col rounded-lg border bg-card/80 backdrop-blur-sm p-6 shadow-md transition-all duration-200",
        "hover:shadow-xl hover:-translate-y-0.5",
        highlight
          ? "border-primary/30 hover:border-primary"
          : "border-border hover:border-muted-foreground/30",
        disabled && "pointer-events-none opacity-70",
      )}
    >
      <div className="space-y-4 flex-1">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            iconBg,
          )}
        >
          {icon}
        </div>

        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        <ul className="space-y-1.5">
          {bullets.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-sm text-muted-foreground"
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
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : buttonLabel}
      </Button>
    </div>
  );
}
