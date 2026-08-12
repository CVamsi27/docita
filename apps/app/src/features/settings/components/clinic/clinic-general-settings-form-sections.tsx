import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FormFieldGroup } from "@workspace/ui/components";
import { Button } from "@workspace/ui/components/form/button";
import { FormControl, FormField } from "@workspace/ui/components/form/form-primitives";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { cn } from "@workspace/ui/lib/utils";
import { parseStringEnumMember } from "@workspace/utils";
import type {
  ClinicSettingsFormValues,
  FacilityTypeType,
} from "@workspace/types";
import type { UseFormReturn } from "react-hook-form";

const monoInputClass = "font-mono text-[var(--fs-sm)] tracking-tight";

function useClinicGeneralSettingsTranslations() {
  return useTranslation("ClinicSettings.general");
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <div className="ui-eyebrow pb-3 pt-1">{children}</div>;
}

function ComplianceIdentifierField({
  form,
  name,
  label,
  id,
  hint,
  placeholder,
}: {
  form: UseFormReturn<ClinicSettingsFormValues>;
  name: "gstin" | "hfrFacilityId";
  label: string;
  id: string;
  hint: string;
  placeholder: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormFieldGroup
          label={label}
          htmlFor={id}
          error={form.formState.errors[name]?.message}
          hint={hint}
        >
          <FormControl id={id}>
            <Input
              id={id}
              autoComplete="off"
              placeholder={placeholder}
              className={monoInputClass}
              {...field}
              value={field.value || ""}
            />
          </FormControl>
        </FormFieldGroup>
      )}
    />
  );
}

export function IdentitySection({
  form,
  facilityLabel,
  facilityLabelValues,
}: {
  form: UseFormReturn<ClinicSettingsFormValues>;
  facilityLabel: string;
  facilityLabelValues: readonly FacilityTypeType[];
}) {
  const { t } = useClinicGeneralSettingsTranslations();
  return (
    <section className="flex flex-col">
      <SectionEyebrow>{t("identityEyebrow")}</SectionEyebrow>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormFieldGroup
              label={t("nameLabel", { facilityLabel })}
              htmlFor="clinic-name"
              required
              error={form.formState.errors.name?.message}
            >
              <FormControl id="clinic-name">
                <Input
                  id="clinic-name"
                  autoComplete="organization"
                  placeholder={t("namePlaceholder", { facilityLabel: facilityLabel.toLowerCase() })}
                  {...field}
                />
              </FormControl>
            </FormFieldGroup>
          )}
        />
        <FormField
          control={form.control}
          name="facilityLabel"
          render={({ field }) => (
            <FormFieldGroup
              label={t("facilityTypeLabel")}
              hint={t("facilityTypeHint")}
            >
              <FormControl>
                <Select
                  value={field.value ?? "CLINIC"}
                  onValueChange={(value) => {
                    const parsed = parseStringEnumMember(
                      facilityLabelValues,
                      value,
                    );
                    if (parsed) field.onChange(parsed);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("facilityTypePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLINIC">{t("facilityTypeClinic")}</SelectItem>
                    <SelectItem value="HOSPITAL">{t("facilityTypeHospital")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
            </FormFieldGroup>
          )}
        />
      </div>
    </section>
  );
}

export function LocationSection({
  form,
  watchedMapsLink,
}: {
  form: UseFormReturn<ClinicSettingsFormValues>;
  watchedMapsLink: string;
}) {
  const { t } = useClinicGeneralSettingsTranslations();
  return (
    <section className="flex flex-col">
      <SectionEyebrow>{t("locationEyebrow")}</SectionEyebrow>
      <div className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormFieldGroup
              label={t("addressLabel")}
              htmlFor="clinic-address"
              required
              error={form.formState.errors.address?.message}
            >
              <FormControl id="clinic-address">
                <Input
                  id="clinic-address"
                  autoComplete="street-address"
                  placeholder={t("addressPlaceholder")}
                  {...field}
                />
              </FormControl>
            </FormFieldGroup>
          )}
        />
        <FormField
          control={form.control}
          name="mapsLink"
          render={({ field }) => (
            <FormFieldGroup
              label={t("mapsLinkLabel")}
              htmlFor="clinic-maps-link"
              error={form.formState.errors.mapsLink?.message}
              hint={t("mapsLinkHint")}
            >
              <FormControl id="clinic-maps-link">
                <Input
                  id="clinic-maps-link"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder={t("mapsLinkPlaceholder")}
                  className={monoInputClass}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              {watchedMapsLink && !form.formState.errors.mapsLink ? (
                <a
                  href={watchedMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {t("previewLinkLabel")}
                </a>
              ) : null}
            </FormFieldGroup>
          )}
        />
      </div>
    </section>
  );
}

export function ContactComplianceSection({
  form,
}: {
  form: UseFormReturn<ClinicSettingsFormValues>;
}) {
  const { t } = useClinicGeneralSettingsTranslations();
  return (
    <section className="flex flex-col">
      <SectionEyebrow>{t("contactComplianceEyebrow")}</SectionEyebrow>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormFieldGroup
              label={t("phoneLabel")}
              htmlFor="clinic-phone"
              required
              error={form.formState.errors.phone?.message}
            >
              <FormControl id="clinic-phone">
                <Input
                  id="clinic-phone"
                  autoComplete="tel"
                  placeholder={t("phonePlaceholder")}
                  className={monoInputClass}
                  {...field}
                />
              </FormControl>
            </FormFieldGroup>
          )}
        />

        <ComplianceIdentifierField
          form={form}
          name="gstin"
          label={t("gstinLabel")}
          id="clinic-gstin"
          hint={t("gstinHint")}
          placeholder={t("gstinPlaceholder")}
        />

        <ComplianceIdentifierField
          form={form}
          name="hfrFacilityId"
          label={t("hfrFacilityIdLabel")}
          id="clinic-hfr-facility-id"
          hint={t("hfrFacilityIdHint")}
          placeholder={t("hfrFacilityIdPlaceholder")}
        />

        <FormField
          control={form.control}
          name="legalName"
          render={({ field }) => (
            <FormFieldGroup
              label={t("legalNameLabel")}
              htmlFor="clinic-legal-name"
              error={form.formState.errors.legalName?.message}
              hint={t("legalNameHint")}
            >
              <FormControl id="clinic-legal-name">
                <Input
                  id="clinic-legal-name"
                  autoComplete="organization"
                  placeholder={t("legalNamePlaceholder")}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
            </FormFieldGroup>
          )}
        />
      </div>
    </section>
  );
}

export function FormFooter({
  form,
  isPending,
}: {
  form: UseFormReturn<ClinicSettingsFormValues>;
  isPending: boolean;
}) {
  const { t } = useClinicGeneralSettingsTranslations();
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => form.reset()}
        disabled={isPending || !form.formState.isDirty}
        className={cn("text-muted-foreground")}
      >
        {t("cancelButton")}
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending ? t("savingButton") : t("saveButton")}
      </Button>
    </div>
  );
}
