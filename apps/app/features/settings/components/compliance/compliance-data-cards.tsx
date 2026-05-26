"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { Shield, Database, ClipboardList, ExternalLink } from "lucide-react";
import { formatDate } from "@workspace/utils";
import type { AppAuditLogSummary, AppComplianceSummary } from "@workspace/types";
import { DATA_RETENTION_POLICIES } from "./compliance-settings-constants";

// ── DPDP Consent Status Card ──────────────────────────────────────────────────

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

// ── Data Retention Policy Card ────────────────────────────────────────────────

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

// ── Audit Log Card ────────────────────────────────────────────────────────────

interface AuditLogCardProps {
  recentAuditLogs: AppAuditLogSummary[] | undefined;
}

export function AuditLogCard({ recentAuditLogs }: AuditLogCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Audit Log
          </CardTitle>
          <CardDescription>
            Recent system access and data change events for your facility.
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
