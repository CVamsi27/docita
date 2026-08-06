import { useNavigate } from "react-router";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@workspace/ui/components";
import {
  Shield,
  Database,
  ClipboardList,
  FileSignature,
  Printer,
} from "lucide-react";
import { formatDate } from "@workspace/utils";
import type { AppAuditLogSummary, AppComplianceSummary } from "@workspace/types";
import { DATA_RETENTION_POLICIES } from "./compliance-settings-constants";

interface DpdpConsentCardProps {
  compliance: AppComplianceSummary | undefined;
}
export function DpdpConsentCard({ compliance }: DpdpConsentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          DPDP Consent Status
        </CardTitle>
        <CardDescription>
          Patient consent management under the Digital Personal Data Protection
          Act 2023.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Consent Collection</p>
            <p className="text-xs text-muted-foreground">
              Patients are asked for consent before data is collected.
            </p>
          </div>
          <Badge variant="outline" className="badge-success">
            Active
          </Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Consent Template</p>
            <p className="text-xs text-muted-foreground">
              {compliance?.consentTemplateUpdatedAt
                ? `Last updated ${formatDate(compliance.consentTemplateUpdatedAt, "dd MMMM yyyy")}`
                : "Default template in use"}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              compliance?.consentTemplateEnabled
                ? "badge-success"
                : "badge-warning"
            }
          >
            {compliance?.consentTemplateEnabled ? "Custom" : "Default"}
          </Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Data Subject Rights</p>
            <p className="text-xs text-muted-foreground">
              Patients can request access, correction, or deletion of their
              data.
            </p>
          </div>
          <Badge variant="outline" className="badge-success">
            Enabled
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConsentTemplateCard() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Printable Patient Consent Form
          </CardTitle>
          <CardDescription>
            Generate a print-ready consent document listing every category of
            patient data this facility collects, how it is used, retention
            timelines, and the patient&apos;s rights under the DPDP Act, 2023.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => navigate("/settings/compliance/consent-template")}>
          <Printer className="mr-2 h-4 w-4" aria-hidden />
          Open template
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Hand the printed form to a new patient at intake, capture their
          signature, and retain the signed copy alongside the digital consent
          recorded in their medical record.
        </p>
      </CardContent>
    </Card>
  );
}

export function DataRetentionCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Retention Policy
        </CardTitle>
        <CardDescription>
          How long different categories of data are retained in compliance with
          applicable regulations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {DATA_RETENTION_POLICIES.map((policy) => (
            <div
              key={policy.category}
              className="flex items-start justify-between py-3"
            >
              <div>
                <p className="text-sm font-medium">{policy.category}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {policy.description}
                </p>
              </div>
              <Badge variant="secondary" className="ml-4 shrink-0">
                {policy.retention}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface AuditLogCardProps {
  recentAuditLogs: AppAuditLogSummary[] | undefined;
}

export function AuditLogCard({ recentAuditLogs }: AuditLogCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Audit Log
        </CardTitle>
        <CardDescription>
          Recent system access and data change events for your facility.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recentAuditLogs && recentAuditLogs.length > 0 ? (
          <div className="divide-y text-sm">
            {recentAuditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-muted-foreground font-mono text-xs">
                  {log.action}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(log.createdAt, "MMM d, HH:mm")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent audit events.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
