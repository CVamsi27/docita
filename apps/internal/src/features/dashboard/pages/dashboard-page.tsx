import { SearchInput } from "@workspace/ui/components/form/search-input";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeClinicsList } from "@workspace/data-access/internal";
import {
  AppPageScaffold,
  Button,
  DataState,
  PageHeader,
} from "@workspace/ui/components";
import {
  Building2,
  FileText,
  Pill,
  TrendingDown,
  TrendingUp,
  Users,
  User,
} from "lucide-react";
import { ClinicList } from "@/features/dashboard/components/clinic-list";
import { FacilityReview } from "@/features/dashboard/components/facility-review";
import { RecordWorkspace } from "@workspace/ui/components/layout/record-workspace";
import { Section } from "@workspace/ui/components/layout/section";
import { CreateClinicDialog } from "../components/create-clinic-dialog";
import { defaultDashboardStats, defaultDashboardTrends } from "../types";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";

export function DashboardPage() {
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState("");
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const queryClient = useQueryClient();
  const { clinics: clinicsQuery, stats: statsQuery } = useDashboardData(
    cursors[cursors.length - 1],
  );
  const clinics = clinicsQuery.data
    ? normalizeClinicsList(clinicsQuery.data)
    : [];
  const filteredClinics = clinics.filter((clinic) =>
    `${clinic.name} ${clinic.email} ${clinic.phone}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  const selected = filteredClinics.find((clinic) => clinic.id === selectedId);
  if (selectedId && clinicsQuery.data && !selected) {
    setSelectedId(null);
    setSelectionMessage("The selected facility is no longer in this view.");
  }
  const handleReview = (clinicId: string, trigger: HTMLButtonElement) => {
    returnFocusRef.current = trigger;
    setSelectedId(clinicId);
    setSelectionMessage("");
  };
  const loading = clinicsQuery.isLoading || statsQuery.isLoading;
  const error = clinicsQuery.error || statsQuery.error;
  const stats = statsQuery.data ?? defaultDashboardStats;
  const trends = statsQuery.data?.trends ?? defaultDashboardTrends;
  const handleRetry = () => {
    void clinicsQuery.refetch();
    void statsQuery.refetch();
  };
  const handleUpdate = () => {
    setSelectedId(null);
    setCursors([undefined]);
    setSearch("");
    void queryClient.invalidateQueries({
      predicate: (query) =>
        typeof query.queryKey[1] === "string" &&
        (query.queryKey[1].startsWith("/api/internal/clinics?") ||
          query.queryKey[1] === "/api/internal/stats"),
    });
  };
  const handleNextPage = () => {
    const nextCursor = clinicsQuery.data?.nextCursor;
    if (nextCursor) {
      setSelectedId(null);
      setCursors((prior) => [...prior, nextCursor]);
      setSearch("");
    }
  };
  const handlePreviousPage = () => {
    setSelectedId(null);
    setCursors((prior) => (prior.length > 1 ? prior.slice(0, -1) : prior));
    setSearch("");
  };

  const renderTrend = (value: number, isPercentage: boolean = false) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <p className="text-xs text-muted-foreground flex items-center mt-1">
        <Icon
          className={`h-3 w-3 mr-1 ${isPositive ? "text-success" : "text-destructive"}`}
        />
        <span className={isPositive ? "text-success" : "text-destructive"}>
          {isPositive ? "+" : ""}
          {value}
          {isPercentage ? "%" : ""}
        </span>
        <span className="ml-1">
          {isPercentage ? "vs last month" : "this month"}
        </span>
      </p>
    );
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Dashboard"
          description="Review facilities and manage access"
          actions={<CreateClinicDialog onClinicCreated={handleUpdate} />}
        />
      }
    >
      <DataState
        status={loading ? "loading" : error ? "error" : "success"}
        loadingMessage="Loading dashboard..."
        errorMessage="We could not load this dashboard. Please refresh and try again."
        onRetry={handleRetry}
      >
        <RecordWorkspace
          contextTitle="Facility review"
          contextDescription="Review access and contact details before editing."
          context={
            selected ? (
              <FacilityReview
                clinic={selected}
                onUpdate={handleUpdate}
                returnFocusRef={returnFocusRef}
              />
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                Select a facility to review its details.
              </p>
            )
          }
          previewOpen={!!selected}
          onPreviewOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
          returnFocusRef={returnFocusRef}
        >
          <Section
            id="dashboard-facilities"
            title="Facilities"
            description="Search facilities on this page · 50 per page"
            className="rounded-none border-x-0 border-t-0 bg-transparent shadow-none"
            contentClassName="p-0"
            actions={
              <div className="w-full sm:w-64">
                <SearchInput
                  placeholder="Search facilities"
                  ariaLabel="Search facilities"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onClear={() => setSearch("")}
                />
              </div>
            }
          >
            <ClinicList
              clinics={filteredClinics}
              loading={false}
              filtered={search.trim().length > 0}
              selectedId={selectedId}
              onReview={handleReview}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-4">
              <p className="text-sm text-muted-foreground">
                Page {cursors.length} · {filteredClinics.length} of{" "}
                {clinics.length} loaded facilities
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  aria-label="Previous facilities page"
                  disabled={cursors.length === 1 || clinicsQuery.isFetching}
                  onClick={handlePreviousPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  aria-label="Next facilities page"
                  disabled={
                    !clinicsQuery.data?.nextCursor ||
                    !clinicsQuery.data.hasMore ||
                    clinicsQuery.isFetching
                  }
                  onClick={handleNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          </Section>
        </RecordWorkspace>
        <p role="status" className="sr-only">
          {selectionMessage}
        </p>
        <Section
          id="dashboard-platform-summary"
          title="Platform summary"
          className="rounded-none border-x-0 border-t-0 bg-transparent shadow-none"
          contentClassName="p-0"
        >
          <div className="grid grid-cols-2 divide-border/60 md:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Total Facilities
                </p>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {stats.clinics}
                </div>
                {renderTrend(trends.clinicsThisMonth)}
              </div>
            </div>
            <div className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Total Doctors</p>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {stats.doctors}
                </div>
                {renderTrend(trends.doctorsThisMonth)}
              </div>
            </div>
            <div className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {stats.patients}
                </div>
                {renderTrend(trends.patientsThisMonth)}
              </div>
            </div>
            <div className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {stats.invoices}
                </div>
                {renderTrend(trends.invoicesPercentChange, true)}
              </div>
            </div>
            <div className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Prescriptions</p>
                <Pill className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {stats.prescriptions}
                </div>
                {renderTrend(trends.prescriptionsPercentChange, true)}
              </div>
            </div>
          </div>
        </Section>
      </DataState>
    </AppPageScaffold>
  );
}
