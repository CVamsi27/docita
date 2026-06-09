"use client";

import { MessageSquarePlus } from "lucide-react";
import type { ClinicWhatsappTemplate } from "@workspace/types";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { TemplateListItem } from "./TemplateListItem";

const CATEGORY_LABELS: Record<string, string> = {
  FOLLOW_UP: "Follow-up",
  APPOINTMENT: "Appointment",
  PRESCRIPTION: "Prescription",
  INVOICE: "Invoice",
  PAYMENT: "Payment",
  MARKETING: "Marketing",
};

interface TemplateListContentProps {
  isLoading: boolean;
  isError: boolean;
  templates: ClinicWhatsappTemplate[];
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (template: ClinicWhatsappTemplate) => void;
  onDelete: (template: ClinicWhatsappTemplate) => void;
}

export function TemplateListContent({
  isLoading,
  isError,
  templates,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}: TemplateListContentProps) {
  if (isLoading) return <DataState status="loading" loadingMessage="Loading templates…" />;

  if (isError) {
    return (
      <DataState
        status="error"
        errorMessage="We could not load templates."
        onRetry={onRetry}
      />
    );
  }

  if (templates.length === 0) {
    return (
      <DataState
        status="empty"
        emptyIcon={MessageSquarePlus}
        emptyTitle="No templates yet"
        emptyDescription="Create a reusable message to speed up patient outreach."
        emptyAction={{ label: "New template", onClick: onCreate }}
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border">
      {templates.map((template) => (
        <TemplateListItem
          key={template.id}
          template={template}
          categoryLabel={CATEGORY_LABELS[template.category] ?? template.category}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
