import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components";
import { Building2 } from "lucide-react";
import { FACILITY_LEAD_TRANSITIONS, type InternalFacilityLeadView } from "@workspace/types";
import { formatDateTime, enIN } from "@workspace/utils";
import { LeadNotificationBadge } from "./lead-notification-badge";
import { LEAD_STATUS_LABELS, leadStatusBadgeVariant } from "../lib/lead-status-labels";

interface LeadsTableProps {
  items: InternalFacilityLeadView[];
  hasActiveFilters: boolean;
  loading: boolean;
  hasMore: boolean;
  pageIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onAssign: (lead: InternalFacilityLeadView) => void;
  onUpdateStatus: (lead: InternalFacilityLeadView) => void;
  onRefresh: () => void;
}

export function LeadsTable({
  items,
  hasActiveFilters,
  loading,
  hasMore,
  pageIndex,
  onNext,
  onPrevious,
  onAssign,
  onUpdateStatus,
  onRefresh,
}: LeadsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Building2 className="h-10 w-10 mb-4" />
        <p>
          {hasActiveFilters
            ? "No leads match these filters"
            : "No leads yet"}
        </p>
      </div>
    );
  }

  return (
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
                (FACILITY_LEAD_TRANSITIONS[lead.status]?.length ?? 0) === 0;
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
                      onAcknowledged={onRefresh}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(lead.createdAt, undefined, { locale: enIN })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAssign(lead)}
                    >
                      Assign
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdateStatus(lead)}
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
            onClick={onPrevious}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore || loading}
            onClick={onNext}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
