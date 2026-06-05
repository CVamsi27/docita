"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/form/button";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import { Feature, type ClinicalInvestigation } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  useInvestigationAttachment,
  validateAttachmentFile,
} from "@/features/consultation/hooks/use-investigation-attachment";
import {
  InvestigationList,
  type InvestigationRowProps,
} from "./investigation-row";

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
  const handleAttach = useInvestigationAttachmentHandler({
    patientId,
    appointmentId,
    doctorId,
    upload,
    setUploadingId,
    onAttachment: updateAt,
  });

  return (
    <InvestigationsSectionShell
      sectionRef={sectionRef}
      subtitle={subtitle}
      readOnly={readOnly}
      onAdd={() => setInvestigations((prev) => [...prev, newInvestigation()])}
    >
      <InvestigationList
        investigations={investigations}
        readOnly={readOnly}
        canAttach={canAttach}
        hasUploadContext={hasUploadContext}
        uploadingId={uploadingId}
        onUpdate={updateAt}
        onRemove={removeAt}
        onAttach={handleAttach}
      />
    </InvestigationsSectionShell>
  );
}

function useInvestigationAttachmentHandler(params: {
  patientId?: string;
  appointmentId?: string;
  doctorId?: string;
  upload: ReturnType<typeof useInvestigationAttachment>["upload"];
  setUploadingId: ReturnType<
    typeof useInvestigationAttachment
  >["setUploadingId"];
  onAttachment: InvestigationRowProps["onUpdate"];
}): InvestigationRowProps["onAttach"] {
  return async (index, row, file) => {
    const attachment = await uploadInvestigationAttachment({
      file,
      row,
      index,
      patientId: params.patientId,
      appointmentId: params.appointmentId,
      doctorId: params.doctorId,
      upload: params.upload,
      setUploadingId: params.setUploadingId,
    });
    if (attachment) {
      params.onAttachment(index, attachment);
    }
  };
}

function InvestigationsSectionShell({
  sectionRef,
  subtitle,
  readOnly,
  onAdd,
  children,
}: {
  sectionRef?: React.Ref<HTMLElement>;
  subtitle: string | undefined;
  readOnly?: boolean;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-investigations"
      letter="I"
      title="Investigations"
      subtitle={subtitle}
      description="Laboratory and imaging orders with status tracking."
      actions={!readOnly ? <AddInvestigationButton onAdd={onAdd} /> : null}
    >
      {children}
    </SectionContainer>
  );
}

function AddInvestigationButton({ onAdd }: { onAdd: () => void }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1.5"
      onClick={onAdd}
    >
      <Plus className="h-3.5 w-3.5" aria-hidden />
      Add
    </Button>
  );
}

async function uploadInvestigationAttachment(params: {
  file: File;
  row: ClinicalInvestigation;
  index: number;
  patientId?: string;
  appointmentId?: string;
  doctorId?: string;
  upload: ReturnType<typeof useInvestigationAttachment>["upload"];
  setUploadingId: ReturnType<
    typeof useInvestigationAttachment
  >["setUploadingId"];
}): Promise<Partial<ClinicalInvestigation> | null> {
  const { file, row, index, patientId, appointmentId, doctorId } = params;
  const validationError = validateAttachmentFile(file);
  if (validationError) {
    showUserFacingErrorToast(validationError);
    return null;
  }
  if (!patientId || !appointmentId || !doctorId) {
    showUserFacingErrorToast("Cannot attach a file for this visit right now.");
    return null;
  }

  const rowKey = row.id ?? `inv-${index}`;
  try {
    params.setUploadingId(rowKey);
    const result = await params.upload({
      file,
      patientId,
      appointmentId,
      doctorId,
      investigationName: row.name,
    });
    showAttachmentToast(Boolean(result.attachmentDocumentId));
    return {
      attachmentUrl: result.attachmentUrl,
      attachmentName: result.attachmentName,
      attachmentDocumentId: result.attachmentDocumentId,
    };
  } catch {
    showUserFacingErrorToast("We couldn't attach this file. Please try again.");
    return null;
  } finally {
    params.setUploadingId(null);
  }
}

function showAttachmentToast(hasDocumentId: boolean): void {
  if (hasDocumentId) {
    toast.success("File attached");
    return;
  }
  toast.message("File attached", {
    description: "Saved to this visit, but it may not appear in Documents.",
  });
}
