"use client";

import { Loader2, Paperclip, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
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
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import { Feature, type ClinicalInvestigation } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  resolveAttachmentUrl,
  useInvestigationAttachment,
  validateAttachmentFile,
} from "@/features/consultation/hooks/use-investigation-attachment";

const INVESTIGATION_CATEGORIES = [
  "LABORATORY",
  "IMAGING",
  "SPECIAL",
  "OTHER",
] as const;
const INVESTIGATION_STATUSES = [
  "ORDERED",
  "PENDING",
  "COMPLETED",
  "CANCELLED",
] as const;

interface InvestigationsSectionProps {
  readOnly?: boolean;
  sectionRef?: React.Ref<HTMLElement>;
  patientId?: string;
  appointmentId?: string;
  doctorId?: string;
}

function newInvestigation(): ClinicalInvestigation {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "IMAGING",
    status: "ORDERED",
    notes: "",
  };
}

export function InvestigationsSection({
  readOnly,
  sectionRef,
  patientId,
  appointmentId,
  doctorId,
}: InvestigationsSectionProps) {
  const subtitle = useConsultationSectionSubtitle("specialty-investigations");
  const investigations = useConsultationDraft((s) => s.investigations);
  const setInvestigations = useConsultationDraft((s) => s.setInvestigations);
  const canAttach = usePermissionStore((s) =>
    s.canAccess(Feature.DOCUMENT_ARCHIVAL),
  );
  const { upload, uploadingId, setUploadingId } = useInvestigationAttachment();
  const hasUploadContext = Boolean(patientId && appointmentId && doctorId);

  const updateAt = (index: number, patch: Partial<ClinicalInvestigation>) => {
    setInvestigations((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const removeAt = (index: number) => {
    setInvestigations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttach = async (
    index: number,
    row: ClinicalInvestigation,
    file: File,
  ) => {
    const validationError = validateAttachmentFile(file);
    if (validationError) {
      showUserFacingErrorToast(validationError);
      return;
    }
    if (!patientId || !appointmentId || !doctorId) {
      showUserFacingErrorToast("Cannot attach a file for this visit right now.");
      return;
    }
    const rowKey = row.id ?? `inv-${index}`;
    try {
      setUploadingId(rowKey);
      const result = await upload({
        file,
        patientId,
        appointmentId,
        doctorId,
        investigationName: row.name,
      });
      updateAt(index, {
        attachmentUrl: result.attachmentUrl,
        attachmentName: result.attachmentName,
        attachmentDocumentId: result.attachmentDocumentId,
      });
      if (result.attachmentDocumentId) {
        toast.success("File attached");
      } else {
        toast.message("File attached", {
          description: "Saved to this visit, but it may not appear in Documents.",
        });
      }
    } catch {
      showUserFacingErrorToast(
        "We couldn't attach this file. Please try again.",
      );
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-investigations"
      letter="I"
      title="Investigations"
      subtitle={subtitle}
      description="Laboratory and imaging orders with status tracking."
      actions={
        !readOnly ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              setInvestigations((prev) => [...prev, newInvestigation()])
            }
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add
          </Button>
        ) : null
      }
    >
      {investigations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No investigations recorded. Add imaging or labs when needed.
        </p>
      ) : (
        <ul className="space-y-4">
          {investigations.map((row, index) => (
            <li
              key={row.id ?? `inv-${index}`}
              className="space-y-3 rounded-[var(--radius-md)] border border-border/70 bg-muted/20 p-4 transition-colors duration-150 hover:bg-muted/30"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="w-full space-y-1.5 sm:min-w-[180px] sm:flex-1">
                  <Label htmlFor={`inv-name-${index}`} className="text-xs">
                    Name
                  </Label>
                  <Input
                    id={`inv-name-${index}`}
                    readOnly={readOnly}
                    placeholder="Study or test name"
                    value={row.name}
                    onChange={(e) => updateAt(index, { name: e.target.value })}
                  />
                </div>
                <div className="w-full space-y-1.5 sm:w-[140px]">
                  <Label className="text-xs">Category</Label>
                  <Select
                    disabled={readOnly}
                    value={row.category ?? "OTHER"}
                    onValueChange={(category) => {
                      const parsed = parseStringEnumMember(
                        INVESTIGATION_CATEGORIES,
                        category,
                      );
                      if (parsed) updateAt(index, { category: parsed });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LABORATORY">Laboratory</SelectItem>
                      <SelectItem value="IMAGING">Imaging</SelectItem>
                      <SelectItem value="SPECIAL">Special</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full space-y-1.5 sm:w-[140px]">
                  <Label className="text-xs">Status</Label>
                  <Select
                    disabled={readOnly}
                    value={row.status ?? "ORDERED"}
                    onValueChange={(status) => {
                      const parsed = parseStringEnumMember(
                        INVESTIGATION_STATUSES,
                        status,
                      );
                      if (parsed) updateAt(index, { status: parsed });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORDERED">Ordered</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!readOnly ? (
                  <SymbolTooltip label="Remove investigation">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remove investigation"
                      onClick={() => removeAt(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </SymbolTooltip>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`inv-notes-${index}`} className="text-xs">
                  Notes / results
                </Label>
                <Textarea
                  id={`inv-notes-${index}`}
                  readOnly={readOnly}
                  className="min-h-[72px]"
                  placeholder="Findings"
                  value={row.notes ?? ""}
                  onChange={(e) => updateAt(index, { notes: e.target.value })}
                />
              </div>

              {row.attachmentUrl ? (
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
                    {row.attachmentName ?? "View attachment"}
                  </a>
                  {!readOnly ? (
                    <SymbolTooltip label="Remove attachment">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Remove attachment"
                        onClick={() =>
                          updateAt(index, {
                            attachmentUrl: undefined,
                            attachmentName: undefined,
                            attachmentDocumentId: undefined,
                          })
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </SymbolTooltip>
                  ) : null}
                </div>
              ) : !readOnly && canAttach && hasUploadContext ? (
                <label
                  className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/50 hover:text-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                  aria-label="Attach a report or scan"
                >
                  {uploadingId === (row.id ?? `inv-${index}`) ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Paperclip className="h-3.5 w-3.5" aria-hidden />
                      Attach report
                    </>
                  )}
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    disabled={uploadingId !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void handleAttach(index, row, file);
                    }}
                  />
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SectionContainer>
  );
}
