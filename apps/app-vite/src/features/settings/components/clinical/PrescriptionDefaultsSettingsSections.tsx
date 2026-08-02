import { FileText, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, FormControl, FormField, FormItem, FormMessage, Label, Skeleton, Textarea } from "@workspace/ui/components";
import type { UseFormReturn } from "react-hook-form";
import type { PrescriptionDefaultsFormValues } from "@workspace/types";

export function PrescriptionDefaultsSkeleton() {
  return (
    <Card
      role="status"
      aria-live="polite"
      aria-label="Loading prescription defaults"
    >
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-1 h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function PrescriptionDefaultsCardHeader() {
  const { t } = useTranslation("Settings");
  return (
    <CardHeader className="border-b border-border/60 pb-5">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <CardTitle>{t("clinical.prescriptionDefaults.title")}</CardTitle>
      </div>
      <CardDescription>
        {t("clinical.prescriptionDefaults.description")}
      </CardDescription>
    </CardHeader>
  );
}

export interface PrescriptionDefaultsFieldProps {
  form: UseFormReturn<PrescriptionDefaultsFormValues>;
}

export function PrescriptionDefaultsInstructionsField({
  form,
}: PrescriptionDefaultsFieldProps) {
  const { t } = useTranslation("Settings");
  return (
    <FormField
      control={form.control}
      name="defaultInstructions"
      render={({ field }) => (
        <FormItem>
          <Label htmlFor="defaultInstructions">{t("clinical.prescriptionDefaults.instructionsLabel")}</Label>
          <FormControl>
            <Textarea
              id="defaultInstructions"
              placeholder={t("clinical.prescriptionDefaults.instructionsPlaceholder")}
              rows={4}
              {...field}
            />
          </FormControl>
          <p className="text-xs text-muted-foreground">
            {t("clinical.prescriptionDefaults.instructionsHelp")}
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function PrescriptionDefaultsFooterField({
  form,
}: PrescriptionDefaultsFieldProps) {
  const { t } = useTranslation("Settings");
  return (
    <FormField
      control={form.control}
      name="defaultFooterText"
      render={({ field }) => (
        <FormItem>
          <Label htmlFor="defaultFooterText">{t("clinical.prescriptionDefaults.footerLabel")}</Label>
          <FormControl>
            <Textarea
              id="defaultFooterText"
              placeholder={t("clinical.prescriptionDefaults.footerPlaceholder")}
              rows={3}
              {...field}
            />
          </FormControl>
          <p className="text-xs text-muted-foreground">
            {t("clinical.prescriptionDefaults.footerHelp")}
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function PrescriptionDefaultsToggleField({
  form,
  name,
  label,
}: PrescriptionDefaultsFieldProps & {
  name: "includeClinicHeader" | "includeDoctorSignature" | "includeQRCode";
  label: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
          <FormControl>
            <Checkbox
              id={name}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <label
            htmlFor={name}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        </FormItem>
      )}
    />
  );
}

export function PrescriptionDefaultsCheckboxGroup({
  form,
}: PrescriptionDefaultsFieldProps) {
  const { t } = useTranslation("Settings");
  return (
    <div className="flex flex-col gap-3 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 p-4">
      <span className="ui-eyebrow">{t("clinical.prescriptionDefaults.optionsTitle")}</span>

      <PrescriptionDefaultsToggleField
        form={form}
        name="includeClinicHeader"
        label={t("clinical.prescriptionDefaults.includeClinicHeader")}
      />
      <PrescriptionDefaultsToggleField
        form={form}
        name="includeDoctorSignature"
        label={t("clinical.prescriptionDefaults.includeDoctorSignature")}
      />
      <PrescriptionDefaultsToggleField
        form={form}
        name="includeQRCode"
        label={t("clinical.prescriptionDefaults.includeQRCode")}
      />
    </div>
  );
}

export interface PrescriptionDefaultsFormActionsProps {
  saving: boolean;
}

export function PrescriptionDefaultsFormActions({
  saving,
}: PrescriptionDefaultsFormActionsProps) {
  const { t } = useTranslation("Settings");
  return (
    <div className="flex justify-end border-t border-border/60 pt-4">
      <Button type="submit" disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? t("clinical.prescriptionDefaults.saving") : t("clinical.prescriptionDefaults.saveButton")}
      </Button>
    </div>
  );
}
