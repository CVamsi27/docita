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
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components";
import { Building2, CheckCircle2 } from "lucide-react";
import {
  FACILITY_LEAD_TRANSITIONS,
  type InternalFacilityLeadView,
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

export function LeadsPage() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<InternalFacilityLeadView[]>([]);
  const [transitioning, setTransitioning] =
    useState<InternalFacilityLeadView | null>(null);
  const [assigning, setAssigning] =
    useState<InternalFacilityLeadView | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<InternalFacilityLeadView[]>(
        "/api/internal/leads",
      );
      setLeads(data);
    } catch {
      /* keep last-known data; the DataState below only renders when loading */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  // "Open" = still in the active chain (has outgoing transitions); terminal
  // and converted leads are not actionable.
  const openCount = leads.filter(
    (l) => (FACILITY_LEAD_TRANSITIONS[l.status]?.length ?? 0) > 0,
  ).length;
  const convertedCount = leads.filter((l) => l.status === "CONVERTED").length;

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
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Leads</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {openCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {convertedCount}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>
              {leads.length} lead record(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Building2 className="h-10 w-10 mb-4" />
                <p>No leads yet</p>
              </div>
            ) : (
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
                    {leads.map((lead) => {
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
                            <Badge variant={leadStatusBadgeVariant(lead.status)}>
                              {LEAD_STATUS_LABELS[lead.status]}
                            </Badge>
                            {lead.duplicateOf && (
                              <div className="text-xs text-destructive">
                                Duplicate of {lead.duplicateOf.facilityName}
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
