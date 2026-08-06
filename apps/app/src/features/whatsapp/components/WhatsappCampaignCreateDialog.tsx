"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateClinicWhatsappCampaign, usePatients, usePreviewClinicWhatsappCampaign } from "@workspace/data-access";
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from "@workspace/ui/components";
import { getPatientFullName } from "@workspace/utils";

interface WhatsappCampaignCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsappCampaignCreateDialog({
  open,
  onOpenChange,
}: WhatsappCampaignCreateDialogProps) {
  const { t } = useTranslation("WhatsApp");
  const patients = usePatients({ limit: 50 });
  const preview = usePreviewClinicWhatsappCampaign();
  const createCampaign = useCreateClinicWhatsappCampaign();
  const [title, setTitle] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const handleCreate = () => {
    if (!title.trim() || !templateName.trim() || selectedIds.length === 0)
      return;
    createCampaign.mutate(
      {
        title: title.trim(),
        templateName: templateName.trim(),
        languageCode: "en",
        patientIds: selectedIds,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle("");
          setTemplateName("");
          setSelectedIds([]);
          preview.reset();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("createDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-title">{t("createDialog.nameLabel")}</Label>
            <Input
              id="campaign-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("createDialog.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-template">{t("createDialog.templateLabel")}</Label>
            <Input
              id="campaign-template"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={t("createDialog.templatePlaceholder")}
            />
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
            {patients.data?.items.map((patient) => {
              const patientId = patient.id;
              return patientId ? (
                <label
                  key={patient.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selected.has(patientId)}
                    onCheckedChange={(checked) =>
                      setSelectedIds((current) =>
                        checked
                          ? [...current, patientId]
                          : current.filter((id) => id !== patientId),
                      )
                    }
                  />
                  {getPatientFullName(patient)}
                </label>
              ) : null;
            })}
          </div>
          {preview.data ? (
            <p className="text-sm text-muted-foreground">
              {preview.data.eligibleCount} {t("createDialog.eligible")} ·{" "}
              {preview.data.skippedCount} {t("createDialog.skipped")}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("createDialog.cancelButton")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={selectedIds.length === 0 || preview.isPending}
            onClick={() => preview.mutate({ patientIds: selectedIds })}
          >
            {t("createDialog.reviewButton")}
          </Button>
          <Button
            type="button"
            disabled={!preview.data || createCampaign.isPending}
            onClick={handleCreate}
          >
            {t("createDialog.createButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
