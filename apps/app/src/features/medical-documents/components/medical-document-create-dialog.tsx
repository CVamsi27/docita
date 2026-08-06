import { useTranslation } from "react-i18next";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components";
import { MEDICAL_DOCUMENT_TYPE_OPTIONS } from "./medical-document-list-config";
import { medicalDocumentTypeLabel } from "@/features/medical-documents/lib/medical-document-type-label";

export function MedicalDocumentCreateDialog({
  open, onOpenChange, newType, setNewType, newTitle, setNewTitle, newFile, showQr, setShowQr, qrUrl, creating, onCreate, onFileChange, onMobileUpload,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; newType: string; setNewType: (v: string) => void; newTitle: string; setNewTitle: (v: string) => void;
  newFile: File | null; newFileUrl: string | null; showQr: boolean; setShowQr: (v: boolean) => void; qrUrl: string | null; creating: boolean;
  onCreate: () => void; onFileChange: (f: File | null) => void; onMobileUpload: () => void;
}) {
  const { t } = useTranslation("MedicalDocuments");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t("createDialog.title")}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("createDialog.typeLabel")}</Label>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEDICAL_DOCUMENT_TYPE_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>{medicalDocumentTypeLabel(value, t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("createDialog.titleLabel")}</Label>
            <Input placeholder={t("createDialog.titlePlaceholder")} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">{t("createDialog.uploadLabel")}</Label>
              <span className="text-xs text-muted-foreground">{t("createDialog.uploadHelper")}</span>
            </div>
            <Input type="file" accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onMobileUpload}>{t("createDialog.mobileUploadButton")}</Button>
              {newFile ? <p className="text-xs text-muted-foreground truncate">{newFile.name}</p> : <p className="text-xs text-muted-foreground">{t("createDialog.fileTypesHint")}</p>}
            </div>
            {showQr && qrUrl ? (
              <div className="rounded-md border bg-muted/20 p-2">
                <p className="text-xs text-muted-foreground">{t("createDialog.qrScanHint")}</p>
                <p className="text-xs font-mono break-all mt-1">{qrUrl}</p>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs mt-1" onClick={() => setShowQr(false)}>{t("createDialog.hideButton")}</Button>
              </div>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("createDialog.cancelButton")}</Button>
          <Button onClick={onCreate} disabled={creating}>{creating ? t("createDialog.creatingButton") : t("createDialog.createButton")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
