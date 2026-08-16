import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  AppPageScaffold,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataState,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components";
import { Building2, X } from "lucide-react";
import {
  FACILITY_LEAD_TRANSITIONS,
  type CursorPaginationResult,
  type InternalFacilityLeadView,
  type InternalOperator,
} from "@workspace/types";
import { formatDateTime, enIN } from "@workspace/utils";
import { apiGet } from "@/lib/api/api-client";
import { LeadAssignDialog } from "../components/lead-assign-dialog";
import { LeadNotificationBadge } from "../components/lead-notification-badge";
import { LeadStatusDialog } from "../components/lead-status-dialog";
import {
  LEAD_STATUS_LABELS,
  leadStatusBadgeVariant,
} from "../lib/lead-status-labels";

/** Sentinel for "no filter" — Radix Select items cannot use empty values. */
const FILTER_ALL = "ALL";
/** Sentinel the API understands for leads with no assigned owner. */
const OWNER_UNASSIGNED = "UNASSIGNED";

interface ReferrerOption {
  id: string;
  name: string;
}

export function LeadsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InternalFacilityLeadView[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  // Cursors used to reach each page beyond the first; stack length = page index.
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [ownerFilter, setOwnerFilter] = useState(FILTER_ALL);
  const [referrerFilter, setReferrerFilter] = useState(FILTER_ALL);
  const [ageFilter, setAgeFilter] = useState(FILTER_ALL);
  // Location is free text: the draft applies on Enter/blur so the queue is
  // not refetched per keystroke; the applied value drives the query.
  const [locationDraft, setLocationDraft] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [duplicateFilter, setDuplicateFilter] = useState(FILTER_ALL);
  const [consentFilter, setConsentFilter] = useState(FILTER_ALL);
  const [operators, setOperators] = useState<InternalOperator[]>([]);
  const [referrers, setReferrers] = useState<ReferrerOption[]>([]);
  // Picker sources load independently of the queue; a failure shows a
  // non-blocking inline error with a retry instead of silently showing
  // only the "All…" options.
  const [pickerError, setPickerError] = useState(false);

  const [transitioning, setTransitioning] =
    useState<InternalFacilityLeadView | null>(null);
  const [assigning, setAssigning] =
    useState<InternalFacilityLeadView | null>(null);

  // The notification deep link points at one lead (`/leads?lead=<id>`);
  // the queue narrows to it until the operator clears back to the queue.
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
      if (referrerFilter !== FILTER_ALL)
        params.set("referrerId", referrerFilter);
      if (ageFilter !== FILTER_ALL) params.set("age", ageFilter);
      if (locationFilter) params.set("location", locationFilter);
      if (duplicateFilter !== FILTER_ALL)
        params.set("duplicate", duplicateFilter);
      if (consentFilter !== FILTER_ALL) params.set("consent", consentFilter);
      // The API reads this as `lead` (same key the notification deep
      // link uses: `/leads?lead=<id>`); do not rename it here.
      if (leadFilter) params.set("lead", leadFilter);
      if (cursor) params.set("cursor", cursor);
      const query = params.toString();
      return query ? `/api/internal/leads?${query}` : "/api/internal/leads";
    },
    [
      statusFilter,
      ownerFilter,
      referrerFilter,
      ageFilter,
      locationFilter,
      duplicateFilter,
      consentFilter,
      leadFilter,
    ],
  );

  const fetchLeads = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const data = await apiGet<
          CursorPaginationResult<InternalFacilityLeadView>
        >(buildQuery(cursor));
        setItems(data.items);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      } catch {
        /* keep last-known data; the DataState below only renders when loading */
      } finally {
        setLoading(false);
      }
    },
    [buildQuery],
  );

  // Any filter change restarts from page one.
  useEffect(() => {
    void fetchLeads();
    setCursorStack([]);
  }, [fetchLeads]);

  // Picker sources for the filter bar (owners + partners). Each list is
  // applied only on success (a partial failure does not clobber the other
  // list); any failure surfaces the inline retry banner below.
  const loadPickerSources = useCallback(async () => {
    let failed = false;
    try {
      const nextOperators = await apiGet<InternalOperator[]>(
        "/api/internal/operators",
      );
      setOperators(nextOperators);
    } catch {
      failed = true;
    }
    try {
      const nextReferrers = await apiGet<ReferrerOption[]>(
        "/api/internal/referrers",
      );
      setReferrers(nextReferrers);
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
    setCursorStack((stack) => [...stack, nextCursor]);
    void fetchLeads(nextCursor);
  };

  const handlePrevious = () => {
    if (loading) return;
    const previousCursor =
      cursorStack.length > 1 ? cursorStack[cursorStack.length - 2] : undefined;
    setCursorStack((stack) => stack.slice(0, -1));
    void fetchLeads(previousCursor);
  };

  const handleApplyLocation = () => {
    setLocationFilter(locationDraft.trim());
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
      header={
        <PageHeader
          title="Facility Leads"
          description="Prospective facilities submitted by referral partners"
          size="compact"
        />
      }
    >
      <DataState
        status={loading ? "loading" : "success"}
        loadingMessage="Loading leads…"
      >
        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>
              Filter the queue and page through results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leadFilter && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-sm text-muted-foreground">
                  Viewing a single lead from a notification
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchParams({}, { replace: true })}
                >
                  Show all leads
                </Button>
              </div>
            )}
            {pickerError && (
              <div
                role="alert"
                className="mb-4 flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2"
              >
                <p className="text-sm text-destructive">
                  Couldn't load the owner/partner lists. The queue is still
                  loading — retry to restore the filters.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadPickerSources()}
                >
                  Retry
                </Button>
              </div>
            )}
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="min-w-44 space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger aria-label="Filter by status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All statuses</SelectItem>
                    {Object.entries(LEAD_STATUS_LABELS).map(
                      ([status, label]) => (
                        <SelectItem key={status} value={status}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-44 space-y-1">
                <Label className="text-xs text-muted-foreground">Owner</Label>
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger aria-label="Filter by owner">
                    <SelectValue placeholder="All owners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All owners</SelectItem>
                    <SelectItem value={OWNER_UNASSIGNED}>Unassigned</SelectItem>
                    {operators.map((operator) => (
                      <SelectItem key={operator.id} value={operator.id}>
                        {operator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-44 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Partner
                </Label>
                <Select
                  value={referrerFilter}
                  onValueChange={setReferrerFilter}
                >
                  <SelectTrigger aria-label="Filter by partner">
                    <SelectValue placeholder="All partners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All partners</SelectItem>
                    {referrers.map((referrer) => (
                      <SelectItem key={referrer.id} value={referrer.id}>
                        {referrer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-40 space-y-1">
                <Label className="text-xs text-muted-foreground">Age</Label>
                <Select value={ageFilter} onValueChange={setAgeFilter}>
                  <SelectTrigger aria-label="Filter by age">
                    <SelectValue placeholder="Any age" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Any age</SelectItem>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-48 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Location
                </Label>
                <div className="relative">
                  <Input
                    aria-label="Filter by location"
                    placeholder="City or state"
                    value={locationDraft}
                    onChange={(event) => setLocationDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleApplyLocation();
                    }}
                    onBlur={handleApplyLocation}
                  />
                  {locationFilter && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Clear location filter"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                      // Keep focus on the input so the clear click cannot
                      // first trigger onBlur and re-apply the stale draft
                      // (which would refetch the old location, racing the
                      // cleared state).
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setLocationDraft("");
                        setLocationFilter("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="min-w-44 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Duplicate
                </Label>
                <Select
                  value={duplicateFilter}
                  onValueChange={setDuplicateFilter}
                >
                  <SelectTrigger aria-label="Filter by duplicate flag">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Any</SelectItem>
                    <SelectItem value="flagged">Flagged duplicates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-40 space-y-1">
                <Label className="text-xs text-muted-foreground">Consent</Label>
                <Select value={consentFilter} onValueChange={setConsentFilter}>
                  <SelectTrigger aria-label="Filter by consent">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Any</SelectItem>
                    <SelectItem value="true">Consented</SelectItem>
                    <SelectItem value="false">Not consented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Building2 className="h-10 w-10 mb-4" />
                <p>
                  {hasActiveFilters
                    ? "No leads match these filters"
                    : "No leads yet"}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Facility</TableHead>
                        <TableHead>Partner</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Notify</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((lead) => {
                        const terminal =
                          (FACILITY_LEAD_TRANSITIONS[lead.status]?.length ?? 0) ===
                          0;
                        return (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium">
                              {lead.facilityName}
                              <div className="text-xs text-muted-foreground">
                                {lead.city}
                                {lead.state ? `, ${lead.state}` : ""}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {lead.referrerName}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {lead.contactName}
                              <div className="text-xs">
                                {lead.contactPhone || lead.contactEmail || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={leadStatusBadgeVariant(lead.status)}
                              >
                                {LEAD_STATUS_LABELS[lead.status]}
                              </Badge>
                              {lead.duplicateOf && (
                                <div className="text-xs text-destructive">
                                  Duplicate of{" "}
                                  {lead.duplicateOf.facilityName}
                                  {lead.duplicateScore != null
                                    ? ` (score ${lead.duplicateScore})`
                                    : ""}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {lead.ownerName ?? (
                                <span className="text-xs">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <LeadNotificationBadge
                                notification={lead.notification}
                                onAcknowledged={() => void fetchLeads()}
                              />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(lead.createdAt, undefined, { locale: enIN })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAssigning(lead)}
                              >
                                Assign
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTransitioning(lead)}
                                disabled={terminal}
                              >
                                Update status
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <span className="text-sm text-muted-foreground">
                    Page {pageIndex + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pageIndex === 0 || loading}
                      onClick={handlePrevious}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasMore || loading}
                      onClick={handleNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </DataState>

      <LeadStatusDialog
        open={transitioning !== null}
        onOpenChange={(open) => {
          if (!open) setTransitioning(null);
        }}
        lead={transitioning}
        onSaved={() => void fetchLeads()}
      />
      <LeadAssignDialog
        open={assigning !== null}
        onOpenChange={(open) => {
          if (!open) setAssigning(null);
        }}
        lead={assigning}
        onSaved={() => void fetchLeads()}
      />
    </AppPageScaffold>
  );
}
