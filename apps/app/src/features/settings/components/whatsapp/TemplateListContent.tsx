import { useTranslation } from "react-i18next";
import { MessageSquarePlus } from "lucide-react";
import type { ClinicWhatsappTemplate } from "@workspace/types";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { TableSkeleton } from "@/components/loaders/page-skeleton";
import { templateCategoryLabel } from "./template-category-label";
import { TemplateListItem } from "./TemplateListItem";

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
  const { t } = useTranslation("WhatsApp");

  if (isLoading)
    return <TableSkeleton rowCount={4} />;

  if (isError) {
    return (
      <DataState
        status="error"
        errorMessage={t("templateCategories.loadError")}
        onRetry={onRetry}
      />
    );
  }

  if (templates.length === 0) {
    return (
      <DataState
        status="empty"
        emptyIcon={MessageSquarePlus}
        emptyTitle={t("templateCategories.emptyTitle")}
        emptyDescription={t("templateCategories.emptyDescription")}
        emptyAction={{
          label: t("templateCategories.newTemplate"),
          onClick: onCreate,
        }}
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border">
      {templates.map((template) => (
        <TemplateListItem
          key={template.id}
          template={template}
          categoryLabel={templateCategoryLabel(template.category, t)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
