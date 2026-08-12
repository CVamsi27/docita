import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Input } from "@workspace/ui/components/form/input";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Stethoscope, Trash2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { useTranslation } from "react-i18next";
import { IcdSearchField } from "./icd-search-field";
import { SelectField } from "./_shared/SelectField";
import type { DiagnosisItem } from "./diagnosis-input-types";

/**
 * A single diagnosis entry in the diagnosis list. Copy resolves through
 * the "Consultation.diagnosisItemRow" message namespace.
 */
function useDiagnosisRowTranslations() {
  const { t } = useTranslation("Consultation");
  // Scoped helper so label keys stay short ("typeProvisional") like the
  // next-intl namespaced originals while resolving full i18next paths.
  return (key: string, params?: Record<string, unknown>) =>
    t(`diagnosisItemRow.${key}`, params);
}

const DIAGNOSIS_TYPE_OPTIONS: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: "provisional", labelKey: "typeProvisional" },
  { value: "differential", labelKey: "typeDifferentialOption" },
  { value: "final", labelKey: "typeFinalOption" },
];

const DIAGNOSIS_STATUS_OPTIONS: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: "active", labelKey: "statusActive" },
  { value: "chronic", labelKey: "statusChronic" },
  { value: "resolved", labelKey: "statusResolved" },
];

export function DiagnosisItemRow({
  item,
  index,
  readOnly,
  medicalCodingEnabled,
  onUpdate,
  onSetIcdCode,
  onRemove,
}: {
  item: DiagnosisItem;
  index: number;
  readOnly: boolean;
  medicalCodingEnabled: boolean;
  onUpdate: (field: keyof DiagnosisItem, fieldValue: string) => void;
  onSetIcdCode: (code: DiagnosisItem["icdCode"]) => void;
  onRemove: () => void;
}) {
  const t = useDiagnosisRowTranslations();
  return (
    <div className="space-y-2 rounded-[var(--radius-md)] border border-border/70 bg-muted/20 p-3 transition-colors duration-150 hover:bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryAvatar
            icon={<Stethoscope />}
            tone="info"
            size="sm"
            aria-label={t("diagnosisAriaLabel")}
          />
          <span className="text-sm font-medium">{t("rowTitle", { index: index + 1 })}</span>
          {item.icdCode ? (
            <Badge variant="outline" className="font-mono text-xs text-primary">
              {item.icdCode.code}
            </Badge>
          ) : null}
          {item.type === "final" ? (
            <Badge variant="default" className="bg-success hover:bg-success">
              {t("typeFinal")}
            </Badge>
          ) : null}
          {item.type === "differential" ? (
            <Badge variant="outline" className="text-muted-foreground">
              {t("typeDifferential")}
            </Badge>
          ) : null}
        </div>
        {!readOnly ? (
          <SymbolTooltip label={t("removeTooltip")}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
              aria-label={t("removeTooltip")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </SymbolTooltip>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-5">
          <Input
            placeholder={t("conditionPlaceholder")}
            value={item.condition}
            onChange={(e) => onUpdate("condition", e.target.value)}
            readOnly={readOnly}
            className="bg-background font-medium"
          />
        </div>
        <div className="col-span-1 md:col-span-3">
          <SelectField
            value={item.type}
            placeholderKey="typePlaceholder"
            options={DIAGNOSIS_TYPE_OPTIONS}
            readOnly={readOnly}
            onChange={(val) => onUpdate("type", val)}
            t={t}
            triggerClassName="bg-background min-h-11 rounded-xl px-4"
          />
        </div>
        <div className="col-span-1 md:col-span-3">
          <SelectField
            value={item.status}
            placeholderKey="statusPlaceholder"
            options={DIAGNOSIS_STATUS_OPTIONS}
            readOnly={readOnly}
            onChange={(val) => onUpdate("status", val)}
            t={t}
            triggerClassName="bg-background min-h-11 rounded-xl px-4"
          />
        </div>

        {medicalCodingEnabled ? (
          <div className="col-span-1 md:col-span-6">
            <label className="text-xs text-muted-foreground mb-1 block">
              {t("icdLabel")}
            </label>
            <IcdSearchField
              value={item.icdCode}
              onSelect={(code) => onSetIcdCode(code)}
              onClear={() => onSetIcdCode(undefined)}
              readOnly={readOnly}
            />
          </div>
        ) : item.icdCode ? (
          <div className="col-span-1 md:col-span-6">
            <label className="text-xs text-muted-foreground mb-1 block">
              {t("icdLabel")}
            </label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="font-mono font-semibold text-primary">
                {item.icdCode.code}
              </span>
              <span className="text-muted-foreground">
                {" "}
                {item.icdCode.description}
              </span>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "col-span-1",
            medicalCodingEnabled || item.icdCode
              ? "md:col-span-6"
              : "md:col-span-12",
          )}
        >
          <label className="text-xs text-muted-foreground mb-1 block">
            {t("notesLabel")}
          </label>
          <Input
            placeholder={t("notesPlaceholder")}
            value={item.notes || ""}
            onChange={(e) => onUpdate("notes", e.target.value)}
            readOnly={readOnly}
            className="bg-background text-sm"
          />
        </div>
      </div>
    </div>
  );
}
