"use client";

// jscpd:ignore-start
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/overlay/dialog";
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
import { getUserFacingErrorMessage } from "@workspace/utils";

import { useCreatePortalMetricDefinition } from "@workspace/data-access";

interface MetricCategory {
  id: string;
  name: string;
}

interface AddMetricDefinitionModalProps {
  categories: MetricCategory[];
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const VALUE_TYPES = [
  { value: "NUMBER", label: "Number" },
  { value: "DECIMAL", label: "Decimal" },
  { value: "TEXT", label: "Text" },
  { value: "BOOLEAN", label: "Yes/No" },
];

/**
 * Phase 3 (per-feature): apps/app Patient Portal > add metric definition modal.
 * 5 literals converted to useTranslations("PatientPortal.addMetricDefinition").
 */
function useAddMetricDefinitionTranslations() {
  return useTranslations("PatientPortal.addMetricDefinition");
}

export function AddMetricDefinitionModal({
  categories,
  open,
  onClose,
  onSuccess,
}: AddMetricDefinitionModalProps) {
  const t = useAddMetricDefinitionTranslations();
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [valueType, setValueType] = useState("NUMBER");
  const [unit, setUnit] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useCreatePortalMetricDefinition();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!label.trim()) {
      setLocalError(t("errorNameRequired"));
      return;
    }
    if (!categoryId) {
      setLocalError(t("errorCategoryRequired"));
      return;
    }

    try {
      await mutateAsync({
        categoryId,
        key: label.trim().toLowerCase().replace(/\s+/g, "_"),
        label: label.trim(),
        valueType,
        unit: unit.trim() || undefined,
        isTrackedByDefault: true,
      });
      setLabel("");
      setCategoryId("");
      setValueType("NUMBER");
      setUnit("");
      onSuccess?.();
      onClose();
    } catch (err) {
      setLocalError(
        getUserFacingErrorMessage(err, {
          fallback: t("errorSaveFailed"),
          context: "save",
        }),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metric-label">{t("nameLabel")}</Label>
            <Input
              id="metric-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isPending}
              placeholder={t("namePlaceholder")}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metric-category">{t("categoryLabel")}</Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={isPending}
            >
              <SelectTrigger id="metric-category">
                <SelectValue placeholder={t("categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="metric-type">{t("valueTypeLabel")}</Label>
              <Select
                value={valueType}
                onValueChange={setValueType}
                disabled={isPending}
              >
                <SelectTrigger id="metric-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALUE_TYPES.map((vt) => (
                    <SelectItem key={vt.value} value={vt.value}>
                      {vt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric-unit">{t("unitLabel")}</Label>
              <Input
                id="metric-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={isPending}
                placeholder={t("unitPlaceholder")}
              />
            </div>
          </div>
          {localError && (
            <p className="text-sm text-destructive">{localError}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              {t("cancelButton")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <DocitaLoadingIndicator
                    variant="inline"
                    decorative
                    className="mr-2"
                  />
                  {t("creatingButton")}
{/* jscpd:ignore-end */}
                </>
              ) : (
                t("createButton")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
