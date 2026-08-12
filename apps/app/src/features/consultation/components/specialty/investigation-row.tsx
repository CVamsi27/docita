import { Loader2, Paperclip, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { type ClinicalInvestigation } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import { resolveAttachmentUrl } from "@/features/consultation/hooks/use-investigation-attachment";
import {
  INVESTIGATION_CATEGORIES,
  INVESTIGATION_STATUSES,
  type InvestigationRowProps,
} from "./investigation-row.helpers";

export type { InvestigationRowProps };

/**
 * The investigations list on the consultation form (LAB / IMAGING / SPECIAL
 * orders plus their results). Copy resolves through the
 * "Consultation.investigation" message namespace.
 */
function useInvestigationTranslations() {
  const { t } = useTranslation("Consultation");
  return (key: string, params?: Record<string, unknown>) =>
    t(`investigation.${key}`, params);
}

export function InvestigationList(
  props: {
    investigations: ClinicalInvestigation[];
  } & Omit<InvestigationRowProps, "row" | "index">,
) {
  const t = useInvestigationTranslations();
  if (props.investigations.length === 0) return (
    <p className="text-sm text-muted-foreground">
      {t("emptyState")}
    </p>
  );

  return (
    <ul className="space-y-4">
      {props.investigations.map((row, index) => (
        <InvestigationRow
          key={row.id ?? `inv-${index}`}
          {...props}
          row={row}
          index={index}
        />
      ))}
    </ul>
  );
}

function InvestigationRow({
  row,
  index,
  readOnly,
  canAttach,
  hasUploadContext,
  uploadingId,
  onUpdate,
  onRemove,
  onAttach,
}: InvestigationRowProps) {
  return (
    <li className="space-y-3 rounded-[var(--radius-md)] border border-border/70 bg-muted/20 p-4 transition-colors duration-150 hover:bg-muted/30">
      <InvestigationHeaderFields
        row={row}
        index={index}
        readOnly={readOnly}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
      <InvestigationNotesField
        row={row}
        index={index}
        readOnly={readOnly}
        onUpdate={onUpdate}
      />
      <InvestigationAttachmentArea
        row={row}
        index={index}
        readOnly={readOnly}
        canAttach={canAttach}
        hasUploadContext={hasUploadContext}
        uploadingId={uploadingId}
        onUpdate={onUpdate}
        onAttach={onAttach}
      />
    </li>
  );
}

function InvestigationHeaderFields(props: {
  row: ClinicalInvestigation;
  index: number;
  readOnly?: boolean;
  onUpdate: InvestigationRowProps["onUpdate"];
  onRemove: InvestigationRowProps["onRemove"];
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <InvestigationNameField {...props} />
      <InvestigationCategoryField {...props} />
      <InvestigationStatusField {...props} />
      {!props.readOnly ? (
        <RemoveInvestigationButton
          index={props.index}
          onRemove={props.onRemove}
        />
      ) : null}
    </div>
  );
}

function InvestigationNameField({
  row,
  index,
  readOnly,
  onUpdate,
}: Pick<InvestigationRowProps, "row" | "index" | "readOnly" | "onUpdate">) {
  const t = useInvestigationTranslations();
  return (
    <div className="w-full space-y-1.5 sm:min-w-[180px] sm:flex-1">
      <Label htmlFor={`inv-name-${index}`} className="text-xs">
        {t("nameLabel")}
      </Label>
      <Input
        id={`inv-name-${index}`}
        readOnly={readOnly}
        placeholder={t("namePlaceholder")}
        value={row.name}
        onChange={(event) => onUpdate(index, { name: event.target.value })}
      />
    </div>
  );
}

function InvestigationCategoryField({
  row,
  index,
  readOnly,
  onUpdate,
}: Pick<InvestigationRowProps, "row" | "index" | "readOnly" | "onUpdate">) {
  const t = useInvestigationTranslations();
  return (
    <div className="w-full space-y-1.5 sm:w-[140px]">
      <Label className="text-xs">{t("categoryLabel")}</Label>
      <Select
        disabled={readOnly}
        value={row.category ?? "OTHER"}
        onValueChange={(category) => {
          const parsed = parseStringEnumMember(
            INVESTIGATION_CATEGORIES,
            category,
          );
          if (parsed) onUpdate(index, { category: parsed });
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="LABORATORY">{t("categoryLaboratory")}</SelectItem>
          <SelectItem value="IMAGING">{t("categoryImaging")}</SelectItem>
          <SelectItem value="SPECIAL">{t("categorySpecial")}</SelectItem>
          <SelectItem value="OTHER">{t("categoryOther")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function InvestigationStatusField({
  row,
  index,
  readOnly,
  onUpdate,
}: Pick<InvestigationRowProps, "row" | "index" | "readOnly" | "onUpdate">) {
  const t = useInvestigationTranslations();
  return (
    <div className="w-full space-y-1.5 sm:w-[140px]">
      <Label className="text-xs">{t("statusLabel")}</Label>
      <Select
        disabled={readOnly}
        value={row.status ?? "ORDERED"}
        onValueChange={(status) => {
          const parsed = parseStringEnumMember(
            INVESTIGATION_STATUSES,
            status,
          );
          if (parsed) onUpdate(index, { status: parsed });
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ORDERED">{t("statusOrdered")}</SelectItem>
          <SelectItem value="PENDING">{t("statusPending")}</SelectItem>
          <SelectItem value="COMPLETED">{t("statusCompleted")}</SelectItem>
          <SelectItem value="CANCELLED">{t("statusCancelled")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function RemoveInvestigationButton({
  index,
  onRemove,
}: Pick<InvestigationRowProps, "index" | "onRemove">) {
  const t = useInvestigationTranslations();
  return (
    <SymbolTooltip label={t("removeInvestigationTooltip")}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={t("removeInvestigationTooltip")}
        onClick={() => onRemove(index)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </SymbolTooltip>
  );
}

function InvestigationNotesField({
  row,
  index,
  readOnly,
  onUpdate,
}: Pick<InvestigationRowProps, "row" | "index" | "readOnly" | "onUpdate">) {
  const t = useInvestigationTranslations();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`inv-notes-${index}`} className="text-xs">
        {t("notesLabel")}
      </Label>
      <Textarea
        id={`inv-notes-${index}`}
        readOnly={readOnly}
        className="min-h-[72px]"
        placeholder={t("notesPlaceholder")}
        value={row.notes ?? ""}
        onChange={(event) => onUpdate(index, { notes: event.target.value })}
      />
    </div>
  );
}

function InvestigationAttachmentArea(props: {
  row: ClinicalInvestigation;
  index: number;
  readOnly?: boolean;
  canAttach: boolean;
  hasUploadContext: boolean;
  uploadingId: string | null;
  onUpdate: InvestigationRowProps["onUpdate"];
  onAttach: InvestigationRowProps["onAttach"];
}) {
  if (props.row.attachmentUrl) {
    return <InvestigationAttachmentLink {...props} />;
  }
  if (!props.readOnly && props.canAttach && props.hasUploadContext) {
    return <InvestigationAttachUploadLabel {...props} />;
  }
  return null;
}

function InvestigationAttachmentLink({
  row,
  index,
  readOnly,
  onUpdate,
}: Pick<InvestigationRowProps, "row" | "index" | "readOnly" | "onUpdate">) {
  const t = useInvestigationTranslations();
  if (!row.attachmentUrl) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2">
      <Paperclip
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <a
        href={resolveAttachmentUrl(row.attachmentUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate text-sm text-primary underline-offset-2 hover:underline"
      >
        {row.attachmentName ?? t("viewAttachment")}
      </a>
      {!readOnly ? (
        <RemoveAttachmentButton index={index} onUpdate={onUpdate} />
      ) : null}
    </div>
  );
}

function RemoveAttachmentButton({
  index,
  onUpdate,
}: Pick<InvestigationRowProps, "index" | "onUpdate">) {
  const t = useInvestigationTranslations();
  return (
    <SymbolTooltip label={t("removeAttachmentTooltip")}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={t("removeAttachmentTooltip")}
        onClick={() =>
          onUpdate(index, {
            attachmentUrl: undefined,
            attachmentName: undefined,
            attachmentDocumentId: undefined,
          })
        }
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </SymbolTooltip>
  );
}

function InvestigationAttachUploadLabel({
  row,
  index,
  uploadingId,
  onAttach,
}: Pick<
  InvestigationRowProps,
  "row" | "index" | "uploadingId" | "onAttach"
>) {
  const t = useInvestigationTranslations();
  const rowKey = row.id ?? `inv-${index}`;
  const isUploading = uploadingId === rowKey;
  return (
    <label
      className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/50 hover:text-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
      aria-label={t("attachReportAriaLabel")}
    >
      <AttachmentUploadLabelContent isUploading={isUploading} />
      <input
        type="file"
        className="sr-only"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        disabled={uploadingId !== null}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void onAttach(index, row, file);
        }}
      />
    </label>
  );
}

function AttachmentUploadLabelContent({
  isUploading,
}: {
  isUploading: boolean;
}) {
  const t = useInvestigationTranslations();
  if (isUploading) return (
    <>
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      {t("uploading")}
    </>
  );
  return (
    <>
      <Paperclip className="h-3.5 w-3.5" aria-hidden />
      {t("attachReport")}
    </>
  );
}
