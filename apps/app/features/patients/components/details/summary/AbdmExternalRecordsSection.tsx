"use client";

import { DataState, Section } from "@workspace/ui/components";
import { FileText } from "lucide-react";
import { ComingSoonBadge } from "@/components/feedback/coming-soon-badge";

export function AbdmExternalRecordsSection() {
  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          External ABDM records
          <ComingSoonBadge />
        </span>
      }
      description="Consent-based records fetched from other ABDM participants."
    >
      <DataState
        status="empty"
        emptyIcon={FileText}
        emptyTitle="Coming soon"
        emptyDescription="External ABDM records fetched through M3 consent will appear here once ABDM integration is live."
      />
    </Section>
  );
}
