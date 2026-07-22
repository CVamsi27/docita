"use client";

// jscpd:ignore-start
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
// jscpd:ignore-end
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  MEDICAL_DOCUMENT_TYPE_LABELS,
  MEDICAL_DOCUMENT_TYPE_OPTIONS,
} from "./medical-document-list-config";

/**
 * Phase 3 (per-feature): apps/app Medical Documents > create dialog.
 * 5 literals converted to useTranslations("MedicalDocuments.createDialog").
 */
function useMedicalDocumentCreateDialogTranslations() {
  return useTranslations("MedicalDocuments.createDialog");
}

export function MedicalDocumentCreateDialog({
  open,
  onOpenChange,
  newType,
  setNewType,
  newTitle,
  setNewTitle,
  newFile,
  newFileUrl,
  showQr,
  setShowQr,
  qrUrl,
  creating,
  onCreate,
  onFileChange,
  onMobileUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newType: string;
  setNewType: (value: string) => void;
  newTitle: string;
  setNewTitle: (value: string) => void;
  newFile: File | null;
  newFileUrl: string | null;
  showQr: boolean;
  setShowQr: (value: boolean) => void;
  qrUrl: string | null;
  creating: boolean;
  onCreate: () => void;
  onFileChange: (file: File | null) => void;
  onMobileUpload: () => void;
}) {
  const t = useMedicalDocumentCreateDialogTranslations();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("typeLabel")}</Label>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDICAL_DOCUMENT_TYPE_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {MEDICAL_DOCUMENT_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("titleLabel")}</Label>
            <Input
              placeholder={t("titlePlaceholder")}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">{t("uploadLabel")}</Label>
              <span className="text-xs text-muted-foreground">
                {t("uploadHelper")}
              </span>
            </div>
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onMobileUpload}
              >
                {t("mobileUploadButton")}
              </Button>
              {newFile ? (
                <p className="text-xs text-muted-foreground truncate">
                  {newFile.name}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("fileTypesHint")}
                </p>
              )}
            </div>
            {showQr && qrUrl ? (
              <div className="rounded-md border bg-muted/20 p-2">
                <p className="text-xs text-muted-foreground">
                  {t("qrScanHint")}
                </p>
                <p className="text-xs font-mono break-all mt-1">{qrUrl}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs mt-1"
                  onClick={() => setShowQr(false)}
                >
                  {t("hideButton")}
                </Button>
              </div>
            ) : null}
            {newFileUrl ? (
              <p className="text-xs text-muted-foreground">{t("fileSelectedLabel")}</p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancelButton")}
          </Button>
          <Button onClick={onCreate} disabled={creating}>
            {creating ? t("creatingButton") : t("createButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
