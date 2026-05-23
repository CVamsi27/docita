"use client";

import type { UseFormReturn } from "react-hook-form";
import { ExternalLink } from "lucide-react";
import { FormFieldGroup } from "@workspace/ui/components";
import { Button } from "@workspace/ui/components/form/button";
import {
  Form,
  FormControl,
  FormField,
} from "@workspace/ui/components/form/form";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { parseStringEnumMember } from "@workspace/utils";
import type { ClinicSettingsFormValues } from "@workspace/types";

export function ClinicGeneralSettingsForm({
  form,
  facilityLabel,
  watchedMapsLink,
  isPending,
  facilityLabelValues,
  onSubmit,
}: {
  form: UseFormReturn<ClinicSettingsFormValues>;
  facilityLabel: string;
  watchedMapsLink: string;
  isPending: boolean;
  facilityLabelValues: readonly ["CLINIC", "HOSPITAL"];
  onSubmit: (data: ClinicSettingsFormValues) => void;
}) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormFieldGroup
                label={`${facilityLabel} Name`}
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
                      if (parsed) {
                        field.onChange(parsed);
                      }
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
              error={form.formState.errors.mapsLink?.message}
              hint="Patients see this in appointment notifications next to the date and time. Paste a Google Maps share URL or Plus code link."
            >
              <FormControl id="clinic-maps-link">
                <Input
                  id="clinic-maps-link"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://maps.google.com/..."
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
                    {...field}
                  />
                </FormControl>
              </FormFieldGroup>
            )}
          />

          <FormField
            control={form.control}
            name="gstin"
            render={({ field }) => (
              <FormFieldGroup
                label="GSTIN"
                htmlFor="clinic-gstin"
                error={form.formState.errors.gstin?.message}
                hint="Needed for GST invoices on paid Indian plans."
              >
                <FormControl id="clinic-gstin">
                  <Input
                    id="clinic-gstin"
                    autoComplete="off"
                    placeholder="GST number"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormFieldGroup>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="legalName"
          render={({ field }) => (
            <FormFieldGroup
              label="Legal name (for tax invoice)"
              htmlFor="clinic-legal-name"
              error={form.formState.errors.legalName?.message}
              hint="Registered legal name shown on your GST certificate. Leave blank to use the facility name on invoices."
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

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
