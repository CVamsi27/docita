"use client";

// jscpd:ignore-start
import { ExternalLink } from "lucide-react";
import { FormFieldGroup } from "@workspace/ui/components";
import { Button } from "@workspace/ui/components/form/button";
import { FormControl, FormField } from "@workspace/ui/components/form/form";
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
// jscpd:ignore-end

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
  return (
    <section className="flex flex-col">
      <SectionEyebrow>Identity</SectionEyebrow>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormFieldGroup
              label={`${facilityLabel} name`}
              htmlFor="clinic-name"
              required
              error={form.formState.errors.name?.message}
            >
              <FormControl id="clinic-name">
                <Input
                  id="clinic-name"
                  autoComplete="organization"
                  placeholder={`Enter ${facilityLabel.toLowerCase()} name`}
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
              label="Facility type"
              hint="Used in navigation, headings, and join flows."
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
                    <SelectValue placeholder="Clinic or Hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLINIC">Clinic</SelectItem>
                    <SelectItem value="HOSPITAL">Hospital</SelectItem>
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
  return (
    <section className="flex flex-col">
      <SectionEyebrow>Location</SectionEyebrow>
      <div className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormFieldGroup
              label="Address"
              htmlFor="clinic-address"
              required
              error={form.formState.errors.address?.message}
            >
              <FormControl id="clinic-address">
                <Input
                  id="clinic-address"
                  autoComplete="street-address"
                  placeholder="Enter address"
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
              label="Google Maps link"
              htmlFor="clinic-maps-link"
              required
              error={form.formState.errors.mapsLink?.message}
              hint="Patients see this in appointment messages. Paste a Google Maps share URL or Plus code link."
            >
              <FormControl id="clinic-maps-link">
                <Input
                  id="clinic-maps-link"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://maps.google.com/..."
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
                  Preview link
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
  return (
    <section className="flex flex-col">
      <SectionEyebrow>Contact &amp; compliance</SectionEyebrow>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormFieldGroup
              label="Phone number"
              htmlFor="clinic-phone"
              required
              error={form.formState.errors.phone?.message}
            >
              <FormControl id="clinic-phone">
                <Input
                  id="clinic-phone"
                  autoComplete="tel"
                  placeholder="Enter phone number"
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
          label="GSTIN"
          id="clinic-gstin"
          hint="Needed for GST invoices on paid Indian plans."
          placeholder="GST number"
        />

        <ComplianceIdentifierField
          form={form}
          name="hfrFacilityId"
          label="HFR Facility ID"
          id="clinic-hfr-facility-id"
          hint="Required before production ABDM M1/M2 use for this facility."
          placeholder="Enter HFR Facility ID"
        />

        <FormField
          control={form.control}
          name="legalName"
          render={({ field }) => (
            <FormFieldGroup
              label="Legal name (for tax invoice)"
              htmlFor="clinic-legal-name"
              error={form.formState.errors.legalName?.message}
              hint="Registered legal name on your GST certificate. Leave blank to use the facility name."
            >
              <FormControl id="clinic-legal-name">
                <Input
                  id="clinic-legal-name"
                  autoComplete="organization"
                  placeholder="e.g. Apollo Multispecialty Pvt. Ltd."
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
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => form.reset()}
        disabled={isPending || !form.formState.isDirty}
        className={cn("text-muted-foreground")}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving\u2026" : "Save changes"}
      </Button>
    </div>
  );
}
