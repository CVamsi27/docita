import { useCallback, useEffect, useState } from "react";
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
import { Building2 } from "lucide-react";
import {
  FACILITY_LEAD_TRANSITIONS,
  type CursorPaginationResult,
  type InternalFacilityLeadView,
  type InternalOperator,
} from "@workspace/types";
import { formatDate } from "../../../lib/formatters";
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
  const [operators, setOperators] = useState<InternalOperator[]>([]);
  const [referrers, setReferrers] = useState<ReferrerOption[]>([]);

  const [transitioning, setTransitioning] =
    useState<InternalFacilityLeadView | null>(null);
  const [assigning, setAssigning] =
    useState<InternalFacilityLeadView | null>(null);

  const hasActiveFilters =
    statusFilter !== FILTER_ALL ||
    ownerFilter !== FILTER_ALL ||
    referrerFilter !== FILTER_ALL;

  const buildQuery = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      if (statusFilter !== FILTER_ALL) params.set("status", statusFilter);
      if (ownerFilter !== FILTER_ALL) params.set("owner", ownerFilter);
      if (referrerFilter !== FILTER_ALL)
        params.set("referrerId", referrerFilter);
      if (cursor) params.set("cursor", cursor);
      const query = params.toString();
      return query ? `/api/internal/leads?${query}` : "/api/internal/leads";
    },
    [statusFilter, ownerFilter, referrerFilter],
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

  // Picker sources for the filter bar (owners + partners).
  useEffect(() => {
    void apiGet<InternalOperator[]>("/api/internal/operators")
      .then(setOperators)
      .catch(() => {});
    void apiGet<ReferrerOption[]>("/api/internal/referrers")
      .then(setReferrers)
      .catch(() => {});
  }, []);

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

  const handleClearFilters = () => {
    setStatusFilter(FILTER_ALL);
    setOwnerFilter(FILTER_ALL);
    setReferrerFilter(FILTER_ALL);
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
                              />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(lead.createdAt)}
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
