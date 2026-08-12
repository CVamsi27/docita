import { type FC, type ReactNode } from "react";
import { Paperclip } from "lucide-react";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components";
import { getPatientFullName } from "@workspace/utils";
import type { ClaimStatus, ClaimType } from "@workspace/types";
import {
  CLAIM_STATUS_LABELS,
  CLAIM_STATUS_TONE,
  CLAIM_TYPE_LABELS,
  centsToMajor,
} from "@/features/insurance-claims/lib/claim-display";

const Row: FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

interface ClaimDetailsCardProps {
  patient: { firstName: string; lastName: string } | null | undefined;
  insurerName: string;
  status: ClaimStatus;
  claimType: ClaimType;
  policyNumber: string;
  tpaName: string | null | undefined;
  claimedAmountCents: number;
  approvedAmountCents: number | null | undefined;
  patientResponsibilityCents: number | null | undefined;
  denialReason: string | null | undefined;
  notes: string | null | undefined;
  formatCurrency: (amount: number) => string;
}

export function ClaimDetailsCard({
  patient,
  insurerName,
  status,
  claimType,
  policyNumber,
  tpaName,
  claimedAmountCents,
  approvedAmountCents,
  patientResponsibilityCents,
  denialReason,
  notes,
  formatCurrency,
}: ClaimDetailsCardProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{insurerName}</CardTitle>
        <Badge variant={CLAIM_STATUS_TONE[status]}>
          {CLAIM_STATUS_LABELS[status]}
        </Badge>
      </CardHeader>
      <CardContent>
        <Row label="Patient" value={getPatientFullName(patient, "—")} />
        <Row label="Type" value={CLAIM_TYPE_LABELS[claimType]} />
        <Row label="Policy number" value={policyNumber} />
        {tpaName && <Row label="TPA" value={tpaName} />}
        <Row
          label="Claimed"
          value={formatCurrency(centsToMajor(claimedAmountCents))}
        />
        {approvedAmountCents != null && (
          <Row
            label="Approved"
            value={formatCurrency(centsToMajor(approvedAmountCents))}
          />
        )}
        {patientResponsibilityCents != null && (
          <Row
            label="Patient responsibility"
            value={formatCurrency(centsToMajor(patientResponsibilityCents))}
          />
        )}
        {denialReason && <Row label="Denial reason" value={denialReason} />}
        {notes && <Row label="Notes" value={notes} />}
      </CardContent>
    </Card>
  );
}

interface UpdateStatusCardProps {
  allowed: ClaimStatus[];
  target: ClaimStatus | null;
  isTransitioning: boolean;
  amount: number;
  reason: string;
  onTargetChange: (status: ClaimStatus | null) => void;
  onAmountChange: (amount: number) => void;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
}

export function UpdateStatusCard({
  allowed,
  target,
  isTransitioning,
  amount,
  reason,
  onTargetChange,
  onAmountChange,
  onReasonChange,
  onConfirm,
}: UpdateStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Update status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {allowed.length === 0 && (
          <p className="text-sm text-muted-foreground">
            This claim is in a final state.
          </p>
        )}
        {allowed.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allowed.map((next) => (
              <Button
                key={next}
                size="sm"
                variant={target === next ? "default" : "outline"}
                onClick={() => onTargetChange(next)}
              >
                {CLAIM_STATUS_LABELS[next]}
              </Button>
            ))}
          </div>
        )}

        {target === "PARTIALLY_APPROVED" && (
          <div>
            <label className="text-sm text-muted-foreground">
              Approved amount
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => onAmountChange(e.target.valueAsNumber || 0)}
            />
          </div>
        )}

        {target === "DENIED" && (
          <Textarea
            placeholder="Enter reason for denial"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
          />
        )}

        {target && (
          <Button
            className="w-full"
            disabled={
              isTransitioning ||
              (target === "DENIED" && !reason.trim()) ||
              (target === "PARTIALLY_APPROVED" && amount <= 0)
            }
            onClick={() => void onConfirm()}
          >
            {isTransitioning
              ? "Updating…"
              : `Confirm: ${CLAIM_STATUS_LABELS[target]}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface ClaimDocumentsCardProps {
  documents: Array<{ id: string; name: string; url: string }> | undefined;
  attachableDocuments: Array<{ id: string; name: string }>;
  documentId: string;
  onDocumentIdChange: (id: string) => void;
  isAttachingDocument: boolean;
  onAttachDocument: (documentId: string) => void;
}
export function ClaimDocumentsCard({
  documents,
  attachableDocuments,
  documentId,
  onDocumentIdChange,
  isAttachingDocument,
  onAttachDocument,
}: ClaimDocumentsCardProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Claim documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(documents?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            No supporting documents attached yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {documents?.map((document) => (
              <li
                key={document.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  {document.name}
                </span>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`View ${document.name}`}
                  >
                    View
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={documentId} onValueChange={onDocumentIdChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select patient document" />
            </SelectTrigger>
            <SelectContent>
              {attachableDocuments.map((document) => (
                <SelectItem key={document.id} value={document.id}>
                  {document.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!documentId || isAttachingDocument}
            onClick={() => void onAttachDocument(documentId)}
          >
            {isAttachingDocument ? "Attaching…" : "Attach document"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
