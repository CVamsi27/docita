"use client";

import { useTranslations } from "next-intl";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
import { Plus, Sparkles } from "lucide-react";
import {
  OFFER_TEMPLATES,
  type OfferTemplate,
  type PricingOfferFormState,
} from "./pricing-helpers";

interface ClinicOption {
  id: string;
  name: string;
}

interface Props {
  offerForm: PricingOfferFormState;
  clinicOptions: ClinicOption[];
  isLoadingClinics: boolean;
  savingId: string | null;
  onFormChange: (form: PricingOfferFormState) => void;
  onSave: () => void;
  onReset: () => void;
  onApplyTemplate: (template: OfferTemplate) => void;
}

/**
 * Phase 3 (per-feature): apps/internal Pricing > Clinic Offer
 * Builder. 12 literals converted to useTranslations
 * (\"InternalPricing.offerBuilder\") — labels, placeholders,
 * the aria-label, and the Save/Reset buttons.
 */
function usePricingOfferBuilderTranslations() {
  return useTranslations("InternalPricing.offerBuilder");
}

export function PricingOfferBuilder({
  offerForm,
  clinicOptions,
  isLoadingClinics,
  savingId,
  onFormChange,
  onSave,
  onReset,
  onApplyTemplate,
}: Props) {
  const t = usePricingOfferBuilderTranslations();
  const set = (patch: Partial<PricingOfferFormState>) =>
    onFormChange({ ...offerForm, ...patch });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t("cardTitle")}
        </CardTitle>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("templatesLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {OFFER_TEMPLATES.map((template) => (
              <Button
                key={template.key}
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onApplyTemplate(template)}
              >
                {template.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("clinicLabel")}</label>
            <Select
              value={offerForm.clinicId}
              onValueChange={(clinicId) => set({ clinicId })}
              disabled={isLoadingClinics}
            >
              <SelectTrigger aria-label={t("clinicAriaLabel")}>
                <SelectValue
                  placeholder={isLoadingClinics ? t("clinicLoading") : t("clinicPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {clinicOptions.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("titleLabel")}</label>
            <Input
              value={offerForm.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder={t("titlePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("percentOffLabel")}</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={offerForm.percentOff}
              onChange={(e) =>
                set({ percentOff: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("durationLabel")}</label>
            <Input
              type="number"
              min={1}
              value={offerForm.durationMonths}
              onChange={(e) =>
                set({ durationMonths: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("validUntilLabel")}</label>
            <DatePicker
              value={offerForm.validUntil || undefined}
              onChange={(date) =>
                set({ validUntil: date?.toISOString().slice(0, 10) ?? "" })
              }
              placeholder={t("datePlaceholder")}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">{t("descriptionLabel")}</label>
            <Input
              value={offerForm.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <label className="text-sm font-medium">{t("notesLabel")}</label>
            <Input
              value={offerForm.notes}
              onChange={(e) => set({ notes: e.target.value })}
              placeholder={t("notesPlaceholder")}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onReset}>
            {t("resetButton")}
          </Button>
          <Button onClick={onSave} disabled={savingId !== null}>
            {savingId === offerForm.clinicId ? (
              <DocitaLoadingIndicator variant="inline" decorative />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t("saveButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
