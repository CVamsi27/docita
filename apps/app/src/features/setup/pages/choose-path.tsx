import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Building2, Check, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { CategoryAvatar, type CategoryAvatarTone } from "@workspace/ui/components/indicators/category-avatar";
import { cn } from "@workspace/ui/lib/utils";
import { typedApi } from "@/lib/api/typed-api-client";
import { logger } from "@/lib/monitoring/logger";
import { useAuth } from "@/lib/auth/auth-context";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { PreDashboardShell } from "@/features/auth";
import { persistReturnPathBeforeLogin } from "@/lib/auth/safe-return-path";

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

export function ChoosePathPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [loadingPath, setLoadingPath] = useState<
    "CREATE_CLINIC" | "JOIN_CLINIC" | null
  >(null);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setRedirectMessage("Redirecting to login…");
      persistReturnPathBeforeLogin();
      navigate("/login", { replace: true });
      return;
    }
    if (user?.clinicId || user?.onboardingStep === "COMPLETED") {
      setRedirectMessage(
        "Account already linked. Redirecting to your workspace…",
      );
      navigate("/today", { replace: true });
      return;
    }
    if (user?.onboardingStep === "CREATING_CLINIC") {
      setRedirectMessage("Taking you back to onboarding…");
      navigate("/onboarding", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const handleChoosePath = async (path: "CREATE_CLINIC" | "JOIN_CLINIC") => {
    setLoadingPath(path);
    try {
      await typedApi.onboarding.choosePath(path);
      await refreshUser();
      navigate(path === "CREATE_CLINIC" ? "/onboarding" : "/join-clinic");
    } catch (error) {
      showUserFacingErrorToast(
        undefined,
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
        <p className="ui-eyebrow">Choose your path</p>
        <h1 className="ui-page-title font-serif">
          {firstName ? `Welcome, ${firstName}!` : "Welcome to Docita!"}
        </h1>
        <p className="ui-page-subtitle">
          How would you like to get started? You can change this later.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PathCard
          icon={<Building2 strokeWidth={1.5} />}
          tone="primary"
          title="Create New Facility"
          description="Set up your own facility and choose a plan"
          bullets={CREATE_BULLETS}
          buttonLabel="Get Started"
          buttonVariant="default"
          badge="Recommended"
          loading={loadingPath === "CREATE_CLINIC"}
          disabled={loadingPath !== null}
          onClick={() => handleChoosePath("CREATE_CLINIC")}
          highlight
        />

        <PathCard
          icon={<Users strokeWidth={1.5} />}
          tone="info"
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
  tone: CategoryAvatarTone;
  title: string;
  description: string;
  bullets: string[];
  buttonLabel: string;
  buttonVariant: "default" | "outline";
  badge?: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  highlight?: boolean;
}

function PathCard({
  icon,
  tone,
  title,
  description,
  bullets,
  buttonLabel,
  buttonVariant,
  badge,
  loading,
  disabled,
  onClick,
  highlight,
}: PathCardProps) {
  return (
    <div
      className={cn(
        "ui-card-surface group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] p-6 transition-[transform,box-shadow,border-color] duration-200",
        "hover:-translate-y-1 hover:shadow-lg",
        highlight
          ? "border-primary/30 ring-1 ring-primary/15 hover:border-primary/60"
          : "border-border/70 hover:border-border",
        disabled && "pointer-events-none opacity-70",
      )}
    >
      {/* Accent bar across the top edge of the recommended card. */}
      {highlight ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"
        />
      ) : null}

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-start justify-between">
          <CategoryAvatar icon={icon} tone={tone} size="lg" />
          {badge ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[var(--fs-2xs)] font-semibold text-primary">
              {badge}
            </span>
          ) : null}
        </div>

        <div className="ui-copy-stack">
          <h2 className="ui-section-title text-[var(--fs-lg)]">{title}</h2>
          <p className="ui-helper-text">{description}</p>
        </div>

        <ul className="space-y-2">
          {bullets.map((item) => (
            <li key={item} className="flex items-center gap-2.5 ui-helper-text">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/15">
                <Check className="h-2.5 w-2.5 text-success" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant={buttonVariant}
        className="mt-6 h-11 w-full font-semibold"
        onClick={onClick}
        disabled={disabled}
      >
        {loading ? (
          <DocitaLoadingIndicator variant="inline" decorative />
        ) : (
          buttonLabel
        )}
      </Button>
    </div>
  );
}
