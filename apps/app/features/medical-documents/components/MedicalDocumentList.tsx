"use client";

import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { FileText, Plus } from "lucide-react";
import { MedicalDocumentCard } from "./medical-document-card";
import { MedicalDocumentCreateDialog } from "./medical-document-create-dialog";
import { useMedicalDocumentList } from "./use-medical-document-list";

interface Props {
  patientId: string;
}
export function MedicalDocumentList({ patientId }: Props) {
  const list = useMedicalDocumentList(patientId);
  if (list.loading)
    return <DataState status="loading" loadingMessage="Loading documents…" />;
  if (list.isError)
    return (
      <DataState
        status="error"
        errorMessage="We could not load these documents. Please try again."
        onRetry={() => list.refetch()}
      />
    );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Medical Documents</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => list.setShowNew(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          New
        </Button>
      </div>
      <MedicalDocumentCreateDialog
        open={list.showNew}
        onOpenChange={list.setShowNew}
        newType={list.newType}
        setNewType={list.setNewType}
        newTitle={list.newTitle}
        setNewTitle={list.setNewTitle}
        newFile={list.newFile}
        newFileUrl={list.newFileUrl}
        showQr={list.showQr}
        setShowQr={list.setShowQr}
        qrUrl={list.qrUrl}
        creating={list.creating}
        onCreate={() => void list.handleCreate()}
        onFileChange={list.handleFileChange}
        onMobileUpload={list.handleMobileUpload}
      />
      {list.documents.length === 0 ? (
        <DataState
          status="empty"
          emptyIcon={FileText}
          emptyTitle="No documents yet"
          emptyDescription="Uploaded and generated medical documents will appear here."
        />
      ) : (
        list.documents.map((doc) => (
          <MedicalDocumentCard
            key={doc.id}
            doc={doc}
            onSign={(id) => void list.handleSign(id)}
            onRevoke={(id) => void list.handleRevoke(id)}
          />
        ))
      )}
    </div>
  );
}
