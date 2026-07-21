"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { ClinicWhatsappTemplate } from "@workspace/types";
import {
  Badge,
  Button
} from "@workspace/ui/components";

interface TemplateListItemProps {
  template: ClinicWhatsappTemplate;
  categoryLabel: string;
  onEdit: (template: ClinicWhatsappTemplate) => void;
  onDelete: (template: ClinicWhatsappTemplate) => void;
}

export function TemplateListItem({
  template,
  categoryLabel,
  onEdit,
  onDelete,
}: TemplateListItemProps) {
  return (
    <li className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{template.name}</span>
          <Badge variant="secondary" className="text-[var(--fs-2xs)]">
            {categoryLabel}
          </Badge>
          {template.isDefault && (
            <Badge variant="outline" className="text-[var(--fs-2xs)]">
              Default
            </Badge>
          )}
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {template.content}
        </p>
      </div>
      {!template.isDefault && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${template.name}`}
            onClick={() => onEdit(template)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${template.name}`}
            onClick={() => onDelete(template)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    </li>
  );
}
