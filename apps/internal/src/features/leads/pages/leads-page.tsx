import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { AppPageScaffold, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, PageHeader } from "@workspace/ui/components";
import { type CursorPaginationResult, type InternalFacilityLeadView, type InternalOperator } from "@workspace/types";
import { apiGet } from "@/lib/api/api-client";
import { LeadAssignDialog } from "../components/lead-assign-dialog";
import { LeadStatusDialog } from "../components/lead-status-dialog";
import { LeadsFilters, FILTER_ALL } from "../components/leads-filters";
import type { ReferrerOption } from "../components/leads-filters";
import { LeadsTable } from "../components/leads-table";

export function LeadsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] = useState<InternalFacilityLeadView[]>([]);
  const fetchGenerationRef = useRef(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [ownerFilter, setOwnerFilter] = useState(FILTER_ALL);
  const [referrerFilter, setReferrerFilter] = useState(FILTER_ALL);
  const [ageFilter, setAgeFilter] = useState(FILTER_ALL);
  const [locationDraft, setLocationDraft] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [duplicateFilter, setDuplicateFilter] = useState(FILTER_ALL);
  const [consentFilter, setConsentFilter] = useState(FILTER_ALL);
  const [operators, setOperators] = useState<InternalOperator[]>([]);
  const [referrers, setReferrers] = useState<ReferrerOption[]>([]);
  const [pickerError, setPickerError] = useState(false);

  const [transitioning, setTransitioning] = useState<InternalFacilityLeadView | null>(null);
  const [assigning, setAssigning] = useState<InternalFacilityLeadView | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const leadFilter = searchParams.get("lead") ?? "";

  const hasActiveFilters =
    statusFilter !== FILTER_ALL ||
    ownerFilter !== FILTER_ALL ||
    referrerFilter !== FILTER_ALL ||
    ageFilter !== FILTER_ALL ||
    locationFilter !== "" ||
    duplicateFilter !== FILTER_ALL ||
    consentFilter !== FILTER_ALL;

  const buildQuery = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      if (statusFilter !== FILTER_ALL) params.set("status", statusFilter);
      if (ownerFilter !== FILTER_ALL) params.set("owner", ownerFilter);
      if (referrerFilter !== FILTER_ALL) params.set("referrerId", referrerFilter);
      if (ageFilter !== FILTER_ALL) params.set("age", ageFilter);
      if (locationFilter) params.set("location", locationFilter);
      if (duplicateFilter !== FILTER_ALL) params.set("duplicate", duplicateFilter);
      if (consentFilter !== FILTER_ALL) params.set("consent", consentFilter);
      if (leadFilter) params.set("lead", leadFilter);
      if (cursor) params.set("cursor", cursor);
      const query = params.toString();
      return query ? `/api/internal/leads?${query}` : "/api/internal/leads";
    },
    [statusFilter, ownerFilter, referrerFilter, ageFilter, locationFilter, duplicateFilter, consentFilter, leadFilter],
  );

  const fetchLeads = useCallback(
    async (cursor?: string) => {
      const generation = ++fetchGenerationRef.current;
      setLoading(true);
      setLoadError(false);
      try {
        const data = await apiGet<CursorPaginationResult<InternalFacilityLeadView>>(buildQuery(cursor));
        if (generation !== fetchGenerationRef.current) return;
        setItems(data.items);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      } catch {
        if (generation !== fetchGenerationRef.current) return;
        setLoadError(true);
      } finally {
        if (generation === fetchGenerationRef.current) {
          setLoading(false);
        }
      }
    },
    [buildQuery],
  );

  useEffect(() => {
    void fetchLeads();
    setCursorStack([]);
  }, [fetchLeads]);

  const loadPickerSources = useCallback(async () => {
    let failed = false;
    try {
      setOperators(await apiGet<InternalOperator[]>("/api/internal/operators"));
    } catch {
      failed = true;
    }
    try {
      setReferrers(await apiGet<ReferrerOption[]>("/api/internal/referrers"));
    } catch {
      failed = true;
    }
    setPickerError(failed);
  }, []);

  useEffect(() => {
    void loadPickerSources();
  }, [loadPickerSources]);

  const pageIndex = cursorStack.length;

  const handleNext = () => {
    if (!nextCursor || loading) return;
    setCursorStack((s) => [...s, nextCursor]);
    void fetchLeads(nextCursor);
  };

  const handlePrevious = () => {
    if (loading) return;
    const prev = cursorStack.length > 1 ? cursorStack[cursorStack.length - 2] : undefined;
    setCursorStack((s) => s.slice(0, -1));
    void fetchLeads(prev);
  };

  const handleClearFilters = () => {
    setStatusFilter(FILTER_ALL);
    setOwnerFilter(FILTER_ALL);
    setReferrerFilter(FILTER_ALL);
    setAgeFilter(FILTER_ALL);
    setLocationDraft("");
    setLocationFilter("");
    setDuplicateFilter(FILTER_ALL);
    setConsentFilter(FILTER_ALL);
  };

  return (
    <AppPageScaffold
      header={<PageHeader title="Facility Leads" description="Prospective facilities submitted by referral partners" size="compact" />}
    >
      <DataState
        status={loadError && items.length === 0 ? "error" : loading ? "loading" : "success"}
        loadingMessage="Loading leads…"
        errorMessage="We could not load the leads queue. Please try again."
        onRetry={() => void fetchLeads()}
      >
        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>Filter the queue and page through results</CardDescription>
          </CardHeader>
          <CardContent>
            {leadFilter && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-sm text-muted-foreground">Viewing a single lead from a notification</p>
                <Button variant="ghost" size="sm" onClick={() => setSearchParams({}, { replace: true })}>Show all leads</Button>
              </div>
            )}
            {pickerError && (
              <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
                <p className="text-sm text-destructive">Couldn't load the owner/partner lists. The queue is still loading — retry to restore the filters.</p>
                <Button variant="ghost" size="sm" onClick={() => void loadPickerSources()}>Retry</Button>
              </div>
            )}
            <LeadsFilters
              statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
              ownerFilter={ownerFilter} onOwnerFilterChange={setOwnerFilter}
              referrerFilter={referrerFilter} onReferrerFilterChange={setReferrerFilter}
              ageFilter={ageFilter} onAgeFilterChange={setAgeFilter}
              locationDraft={locationDraft} onLocationDraftChange={setLocationDraft}
              locationFilter={locationFilter}
              onApplyLocation={() => setLocationFilter(locationDraft.trim())}
              onClearLocation={() => { setLocationDraft(""); setLocationFilter(""); }}
              duplicateFilter={duplicateFilter} onDuplicateFilterChange={setDuplicateFilter}
              consentFilter={consentFilter} onConsentFilterChange={setConsentFilter}
              hasActiveFilters={hasActiveFilters} onClearFilters={handleClearFilters}
              operators={operators} referrers={referrers}
            />
            <LeadsTable
              items={items} hasActiveFilters={hasActiveFilters}
              loading={loading} hasMore={hasMore} pageIndex={pageIndex}
              onNext={handleNext} onPrevious={handlePrevious}
              onAssign={setAssigning} onUpdateStatus={setTransitioning}
              onRefresh={() => void fetchLeads()}
            />
          </CardContent>
        </Card>
      </DataState>
      <LeadStatusDialog open={transitioning !== null} onOpenChange={(open) => { if (!open) setTransitioning(null); }} lead={transitioning} onSaved={() => void fetchLeads()} />
      <LeadAssignDialog open={assigning !== null} onOpenChange={(open) => { if (!open) setAssigning(null); }} lead={assigning} onSaved={() => void fetchLeads()} />
    </AppPageScaffold>
  );
}
