import { SearchInput } from "@workspace/ui/components/form/search-input";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeClinicsList } from "@workspace/data-access/internal";
import {
  AppPageScaffold,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataState,
  PageHeader,
} from "@workspace/ui/components";
import {
  Building2,
  FileText,
  Pill,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { ClinicList } from "../components/clinic-list";
import { CreateClinicDialog } from "../components/create-clinic-dialog";
import { defaultDashboardStats, defaultDashboardTrends } from "../types";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";

export function DashboardPage() {
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [search, setSearch] = useState("");
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
  const loading = clinicsQuery.isLoading || statsQuery.isLoading;
  const error = clinicsQuery.error || statsQuery.error;
  const stats = statsQuery.data ?? defaultDashboardStats;
  const trends = statsQuery.data?.trends ?? defaultDashboardTrends;
  const handleRetry = () => {
    void clinicsQuery.refetch();
    void statsQuery.refetch();
  };
  const handleUpdate = () => {
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
      setCursors((prior) => [...prior, nextCursor]);
      setSearch("");
    }
  };
  const handlePreviousPage = () => {
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
          description="Monitor all facilities and platform metrics"
          size="compact"
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
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Facilities
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {stats.clinics}
              </div>
              {renderTrend(trends.clinicsThisMonth)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Doctors
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {stats.doctors}
              </div>
              {renderTrend(trends.doctorsThisMonth)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Patients
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {stats.patients}
              </div>
              {renderTrend(trends.patientsThisMonth)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Invoices
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {stats.invoices}
              </div>
              {renderTrend(trends.invoicesPercentChange, true)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prescriptions
              </CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {stats.prescriptions}
              </div>
              {renderTrend(trends.prescriptionsPercentChange, true)}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Facilities</CardTitle>
                <CardDescription>
                  Search and browse facilities, 50 per page
                </CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <SearchInput
                  placeholder="Search facilities"
                  ariaLabel="Search facilities"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onClear={() => setSearch("")}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ClinicList
              clinics={filteredClinics}
              loading={false}
              filtered={search.trim().length > 0}
              onUpdate={handleUpdate}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
          </CardContent>
        </Card>
      </DataState>
    </AppPageScaffold>
  );
}
