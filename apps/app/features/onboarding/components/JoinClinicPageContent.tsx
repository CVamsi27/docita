"use client";

import { Search } from "lucide-react";
import { Input } from "@workspace/ui/components/form/input";
import { Button } from "@workspace/ui/components/form/button";
import { ClearSearchButton } from "@/components/buttons/clear-search-button";
import { cn } from "@workspace/ui/lib/utils";
import { Card } from "@workspace/ui/components/indicators/card";
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

        {clinics.length === 0 && searchQuery && !isSearching ? (
          <Card className="ui-card-surface p-8 text-center">
            <p className="ui-helper-text">
              No facilities found, try a different search term
            </p>
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
