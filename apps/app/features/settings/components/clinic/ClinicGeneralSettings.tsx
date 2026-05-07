"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { FormFieldGroup } from "@workspace/ui/components";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { Form, FormControl, FormField } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  phoneSchema,
  requiredStringSchema,
} from "@/features/_shared/schemas/common.schemas";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { getFacilityLabel } from "@workspace/utils";
import { SettingsAiChips } from "@/features/settings/components/settings-ai-chips";
import { CopyableLinkField } from "@/features/_shared/components/signature/copyable-link-field";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import {
  parseWorkspaceProfile,
  WORKSPACE_PROFILE_LABEL,
} from "@workspace/types";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription-settings-path";

const clinicSettingsSchema = z.object({
  name: requiredStringSchema("Facility Name"),
  address: requiredStringSchema("Address"),
  phone: phoneSchema,
  gstin: z.union([z.string().trim(), z.literal("")]).optional(),
  facilityLabel: z.enum(["CLINIC", "HOSPITAL"]).optional(),
  mapsLink: z
    .union([
      z.string().trim().url({ message: "Enter a valid Google Maps URL" }),
      z.literal(""),
    ])
    .optional(),
});

type ClinicSettingsFormValues = z.infer<typeof clinicSettingsSchema>;

export function ClinicGeneralSettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateClinic, isPending } = useUpdateClinicSettings();
  const [copied, setCopied] = useState(false);
  const facilityLabel = getFacilityLabel(
    clinic?.settings?.facilityLabel as "CLINIC" | "HOSPITAL" | undefined,
  );

  const handleCopyCode = () => {
    const code = clinic?.referralCode;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const form = useForm<ClinicSettingsFormValues>({
    resolver: zodResolver(clinicSettingsSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      gstin: "",
      facilityLabel: "CLINIC",
      mapsLink: "",
    },
  });

  useEffect(() => {
    if (clinic) {
      const settings = clinic.settings as
        | { facilityLabel?: "CLINIC" | "HOSPITAL"; mapsLink?: string }
        | null
        | undefined;
      form.reset({
        name: clinic.name || "",
        address: clinic.address || "",
        phone: clinic.phone || "",
        gstin: clinic.gstin || "",
        facilityLabel: settings?.facilityLabel ?? "CLINIC",
        mapsLink: settings?.mapsLink ?? "",
      });
    }
  }, [clinic, form]);

  const watchedMapsLink = form.watch("mapsLink")?.trim() ?? "";

  const handleSubmit = (data: ClinicSettingsFormValues) => {
    updateClinic(data, {
      onSuccess: () => {
        toast.success("Facility settings updated successfully");
      },
      onError: (error) => {
        showUserFacingErrorToast(
          error,
          "We could not save your facility details. Please try again.",
          "save",
        );
      },
    });
  };

  if (isLoading) {
    return (
      <Card
        role="status"
        aria-live="polite"
        aria-label="Loading facility information"
      >
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const workspaceLabel = WORKSPACE_PROFILE_LABEL[
    parseWorkspaceProfile(clinic?.workspaceProfile)
  ];

  return (
    <div className="space-y-4">
      <SettingsAiChips scope="clinic-general" />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[var(--fs-md)]">Workspace mode</CardTitle>
          <CardDescription>
            This is separate from your subscription tier (Starter, Essential, and
            so on). It controls which areas of Docita stay available to your team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium text-foreground">{workspaceLabel}</p>
          <p className="text-muted-foreground">
            Plan limits, invoices, and upgrades live under{" "}
            <Link
              href={SUBSCRIPTION_SETTINGS_PATH}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Billing and subscription
            </Link>
            .
          </p>
        </CardContent>
      </Card>
      <Card>
      <CardHeader>
        <CardTitle>{facilityLabel} Information</CardTitle>
        <CardDescription>Basic settings and information</CardDescription>
      </CardHeader>
      <CardContent>
        {!!clinic?.referralCode && (
          <div className="mb-6 space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <MicroLabel as="h3">Staff workspace</MicroLabel>
              <p className="mt-2 text-sm font-medium text-foreground">
                Join code for Docita
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Doctors and staff enter this code in the Docita app to join this{" "}
                {facilityLabel.toLowerCase()}. Do not send this code to patients
                for appointments.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="text-sm font-mono font-semibold tracking-wider text-foreground">
                  {clinic.referralCode}
                </code>
                <SymbolTooltip label={`Copy staff join code`}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleCopyCode}
                    aria-label="Copy staff join code"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </SymbolTooltip>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <MicroLabel as="h3">Patient booking</MicroLabel>
              <p className="mt-2 text-sm font-medium text-foreground">
                Public booking page
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Send this link to patients so they can request a visit without a
                Docita account. This is not the staff join code.
              </p>
              <div className="mt-3">
                <CopyableLinkField
                  value={`${getPublicAppOrigin()}/book/${encodeURIComponent(clinic.referralCode)}`}
                  helperText="Opens your clinic’s online booking form."
                />
              </div>
            </div>
          </div>
        )}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
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
                        onValueChange={(value) =>
                          field.onChange(value as "CLINIC" | "HOSPITAL")
                        }
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
                  {watchedMapsLink &&
                  !form.formState.errors.mapsLink ? (
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
                    label="Phone Number"
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

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                {isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      </Card>
    </div>
  );
}
