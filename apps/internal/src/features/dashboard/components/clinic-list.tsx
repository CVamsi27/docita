import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import {
  ListRow,
  ListRowGroup,
} from "@workspace/ui/components/data-display/list-row";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { Button } from "@workspace/ui/components/form/button";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { Building2 } from "lucide-react";
import type { InternalClinicListEntry } from "@workspace/types";

interface ClinicListProps {
  clinics: InternalClinicListEntry[];
  loading: boolean;
  filtered?: boolean;
  selectedId: string | null;
  onReview: (clinicId: string, trigger: HTMLButtonElement) => void;
}

export function ClinicList({
  clinics,
  loading,
  filtered = false,
  selectedId,
  onReview,
}: ClinicListProps) {
  const reviewButton = (clinic: InternalClinicListEntry) => (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Review facility: ${clinic.name}`}
      aria-pressed={selectedId === clinic.id}
      onClick={(event) => onReview(clinic.id, event.currentTarget)}
    >
      Review
    </Button>
  );

  return (
    <DataState
      status={loading ? "loading" : clinics.length ? "success" : "empty"}
      loadingMessage="Loading facilities…"
      emptyIcon={Building2}
      emptyTitle={filtered ? "No matching facilities" : "No facilities yet"}
      emptyDescription={
        filtered
          ? "Try another search on this page, or browse the next page."
          : "Add your first facility to get started."
      }
    >
      <div className="hidden lg:block">
        <Table className="min-w-0">
          <caption className="sr-only">Facilities on the current page</caption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%]">Name</TableHead>
              <TableHead className="w-[17%]">Type</TableHead>
              <TableHead className="w-[20%]">Access tier</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
              <TableHead className="w-[13%] text-right">
                <span className="sr-only">Review</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clinics.map((clinic) => (
              <TableRow
                key={clinic.id}
                className={
                  selectedId === clinic.id
                    ? "border-l-2 border-l-primary bg-muted/60"
                    : undefined
                }
              >
                <TableCell className="py-4 font-medium">
                  <span className="block break-words">{clinic.name}</span>
                  {selectedId === clinic.id ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      Selected
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {humanizeUiLabel(clinic.type)}
                </TableCell>
                <TableCell className="text-sm">
                  {humanizeUiLabel(clinic.tier)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={clinic.active ? "active" : "inactive"} />
                </TableCell>
                <TableCell className="text-right">
                  {reviewButton(clinic)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ListRowGroup className="rounded-none border-0 bg-transparent lg:hidden">
        {clinics.map((clinic) => (
          <ListRow
            key={clinic.id}
            title={clinic.name}
            meta={`${humanizeUiLabel(clinic.type)} · ${humanizeUiLabel(clinic.tier)}${selectedId === clinic.id ? " · Selected" : ""}`}
            status={clinic.active ? "active" : "inactive"}
            trailing={reviewButton(clinic)}
            showChevron={false}
          />
        ))}
      </ListRowGroup>
    </DataState>
  );
}
