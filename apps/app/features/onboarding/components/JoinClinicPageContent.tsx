"use client";

import { Building2, Mail, Search, X } from "lucide-react";
import Link from "next/link";
import {
  Button,
  Card,
  Input
} from "@workspace/ui/components";
import { ClearSearchButton } from "@/components/buttons/clear-search-button";
import { cn } from "@workspace/ui/lib/utils";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { PreDashboardShell } from "@/features/auth";
import { BackButton } from "@/components/navigation/back-button";
import { JoinClinicRequestDialog } from "@/features/onboarding/components/join-clinic-request-dialog";
import { JoinClinicSearchResults } from "@/features/onboarding/components/join-clinic-search-results";
import { useJoinClinicPage } from "@/features/onboarding/hooks/use-join-clinic-page";

export default function JoinClinicPage() {
  const {
    searchQuery,
    setSearchQuery,
    clinics,
    isSearching,
    selectedClinic,
    setSelectedClinic,
    requestedRole,
    setRequestedRole,
    message,
    setMessage,
    isSubmitting,
    isRedirecting,
    handleSearch,
    handleSubmitRequest,
    handleSearchKeyPress,
  } = useJoinClinicPage();

  if (isRedirecting) return (
      <PageTransitionLoader
        title="Request submitted"
        description="Taking you to request status"
      />
    );

  const trimmedQuery = searchQuery.trim();
  const showEmptyState = trimmedQuery.length > 0 && clinics.length === 0 && !isSearching;

  return (
    <PreDashboardShell
      currentStep="join-clinic"
      contentMaxWidth="max-w-2xl"
      contentAlignment="start"
      showSignOut
    >
      <div className="ui-copy-stack">
        <BackButton
          fallback="/choose-path"
          label="Back to Choose Path"
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
        />
        <p className="ui-eyebrow">Join existing facility</p>
        <h1 className="ui-page-title">Find your facility</h1>
        <p className="ui-page-subtitle">
          Search by name, email, or referral code, then send a request to join.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Enter facility name, email, or referral code"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className={cn("h-11 pl-10", searchQuery.trim() && "pr-10")}
              aria-label="Search facilities to join"
            />
            {searchQuery.trim() ? (
              <ClearSearchButton onClear={() => setSearchQuery("")} />
            ) : null}
          </div>
          <Button
            onClick={() => void handleSearch()}
            disabled={isSearching}
            className="h-11"
          >
            {isSearching ? "Searching…" : "Search"}
          </Button>
        </div>

        {showEmptyState ? (
          <Card
            className="ui-card-surface space-y-4 p-6 text-left"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground"
                aria-hidden
              >
                <X className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  No facilities matched &ldquo;{trimmedQuery}&rdquo;
                </p>
                <p className="ui-helper-text">
                  Facility search uses the exact name, registered email, or
                  referral code your admin shared with you. If you joined
                  recently, ask your admin to confirm the search term.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 p-3">
                <Building2
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Facility not on Docita yet? Switch to{" "}
                  <Link
                    href="/choose-path"
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    Create new facility
                  </Link>{" "}
                  to set one up.
                </p>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 p-3">
                <Mail
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Can&rsquo;t reach your admin?{" "}
                  <Link
                    href="/contact"
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    Contact Docita
                  </Link>{" "}
                  and we&rsquo;ll connect you.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        <JoinClinicSearchResults
          clinics={clinics}
          onSelectClinic={setSelectedClinic}
        />
      </div>

      <JoinClinicRequestDialog
        clinic={selectedClinic}
        requestedRole={requestedRole}
        message={message}
        isSubmitting={isSubmitting}
        onOpenChange={() => setSelectedClinic(null)}
        onRoleChange={setRequestedRole}
        onMessageChange={setMessage}
        onSubmit={() => void handleSubmitRequest()}
      />
    </PreDashboardShell>
  );
}
