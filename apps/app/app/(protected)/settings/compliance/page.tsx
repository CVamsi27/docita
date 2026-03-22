"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  CheckCircle2,
  FileText,
  Shield,
  Database,
  ClipboardList,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ClinicSlaSignatureQR } from "@/features/settings/components/clinic-sla-signature-qr";
import { useAPIQuery } from "@/lib/api-core";

interface ClinicCompliance {
  slaSignatureUrl: string | null;
  slaSignatureAcceptedAt: string | null;
  consentTemplateEnabled?: boolean;
  consentTemplateUpdatedAt?: string | null;
}

interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  actor?: { name: string };
}

const DATA_RETENTION_POLICIES = [
  {
    category: "Patient Records",
    retention: "7 years",
    description: "Medical records retained per DPDP Act 2023 guidelines.",
  },
  {
    category: "Appointment History",
    retention: "5 years",
    description: "Appointment logs retained for continuity of care.",
  },
  {
    category: "Audit Logs",
    retention: "3 years",
    description: "System access and data change logs.",
  },
  {
    category: "Prescription Data",
    retention: "7 years",
    description: "Prescription records per clinical documentation standards.",
  },
];

export default function ComplianceSettingsPage() {
  const { user } = useAuth();
  const clinicId = user?.clinicId ?? "";

  const { data: compliance } = useAPIQuery<ClinicCompliance>(
    ["clinic-compliance", clinicId],
    `/clinics/${clinicId}/compliance`,
    { enabled: !!clinicId },
  );

  const { data: recentAuditLogs } = useAPIQuery<AuditLogEntry[]>(
    ["audit-logs-recent", clinicId],
    `/audit/recent?limit=5`,
    { enabled: !!clinicId },
  );

  return (
    <div className="container mx-auto max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compliance</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Legal agreements, data protection, and audit information for your clinic.
        </p>
      </div>

      {compliance?.slaSignatureUrl && compliance.slaSignatureAcceptedAt && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            SLA accepted and signed on{" "}
            {format(new Date(compliance.slaSignatureAcceptedAt), "PPP")}
          </AlertDescription>
        </Alert>
      )}

      {/* SLA Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Service Level Agreement Signature
          </CardTitle>
          <CardDescription>
            Your SLA signature is a legally binding record of your acceptance of
            Docita&apos;s service terms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {compliance?.slaSignatureUrl && (
            <div className="mb-4 rounded-md border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Current signature on file</p>
              <Image
                src={compliance.slaSignatureUrl}
                alt="Current SLA signature"
                width={200}
                height={80}
                className="max-h-20 object-contain"
                unoptimized
              />
            </div>
          )}
          <ClinicSlaSignatureQR clinicId={clinicId} />
        </CardContent>
      </Card>

      {/* DPDP Consent Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            DPDP Consent Status
          </CardTitle>
          <CardDescription>
            Patient consent management under the Digital Personal Data Protection Act 2023.
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
                  ? `Last updated ${format(new Date(compliance.consentTemplateUpdatedAt), "PPP")}`
                  : "Default template in use"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                compliance?.consentTemplateEnabled ? "badge-success" : "badge-warning"
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
                Patients can request access, correction, or deletion of their data.
              </p>
            </div>
            <Badge variant="outline" className="badge-success">
              Enabled
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Retention Policy
          </CardTitle>
          <CardDescription>
            How long different categories of data are retained in compliance with applicable regulations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {DATA_RETENTION_POLICIES.map((policy) => (
              <div key={policy.category} className="flex items-start justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{policy.category}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{policy.description}</p>
                </div>
                <Badge variant="secondary" className="ml-4 shrink-0">
                  {policy.retention}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Access */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Audit Log
            </CardTitle>
            <CardDescription>
              Recent system access and data change events for your clinic.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings?tab=audit">
              View all
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentAuditLogs && recentAuditLogs.length > 0 ? (
            <div className="divide-y text-sm">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground font-mono text-xs">{log.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.createdAt), "MMM d, HH:mm")}
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
    </div>
  );
}
