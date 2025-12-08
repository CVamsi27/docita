"use client";

import { AuditLogViewer } from "@/components/audit/audit-log-viewer";

export default function AuditsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          View all user actions and system changes with detailed timestamps and
          user information.
        </p>
      </div>

      <AuditLogViewer />
    </div>
  );
}
