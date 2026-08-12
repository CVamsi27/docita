import { useTranslation } from "react-i18next";
import { Button, DataState, type DataStateStatus } from "@workspace/ui/components";
import { FileText, Plus } from "lucide-react";
import { MedicalDocumentCard } from "./medical-document-card";
import { MedicalDocumentCreateDialog } from "./medical-document-create-dialog";
import { useMedicalDocumentList } from "./use-medical-document-list";

interface Props { patientId: string; }

export function MedicalDocumentList({ patientId }: Props) {
  const { t } = useTranslation("MedicalDocuments");
  const list = useMedicalDocumentList(patientId);
  const status: DataStateStatus = list.loading ? "loading" : list.isError ? "error" : "success";

  if (list.loading || list.isError) {
    return <DataState status={status} loadingMessage={t("list.loading")} errorMessage={t("list.error")} onRetry={() => list.refetch()} />;
  }

  return (
    <DataState status={list.documents.length === 0 ? "empty" : "success"} emptyIcon={FileText} emptyTitle={t("list.emptyTitle")} emptyDescription={t("list.emptyDescription")}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("list.title")}</h3>
          <Button size="sm" variant="outline" onClick={() => list.setShowNew(true)}><Plus className="h-3 w-3 mr-1" /> {t("list.newButton")}</Button>
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
        {list.documents.map((doc) => (
          <MedicalDocumentCard key={doc.id} doc={doc} onSign={(id) => void list.handleSign(id)} onRevoke={(id) => void list.handleRevoke(id)} />
        ))}
      </div>
    </DataState>
  );
}
