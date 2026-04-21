"use client";

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
import { Form, FormControl, FormField } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  phoneSchema,
  requiredStringSchema,
} from "@/features/_shared/schemas/common.schemas";
import { Copy, Check } from "lucide-react";
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

const clinicSettingsSchema = z.object({
  name: requiredStringSchema("Facility Name"),
  address: requiredStringSchema("Address"),
  phone: phoneSchema,
  gstin: z.union([z.string().trim(), z.literal("")]).optional(),
  facilityLabel: z.enum(["CLINIC", "HOSPITAL"]).optional(),
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
    },
  });

  useEffect(() => {
    if (clinic) {
      form.reset({
        name: clinic.name || "",
        address: clinic.address || "",
        phone: clinic.phone || "",
        gstin: clinic.gstin || "",
        facilityLabel:
          (clinic.settings?.facilityLabel as "CLINIC" | "HOSPITAL" | undefined) ??
          "CLINIC",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic]);

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
      <Card >
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

  return (
    <Card >
      <CardHeader>
        <CardTitle>{facilityLabel} Information</CardTitle>
        <CardDescription>Basic settings and information</CardDescription>
      </CardHeader>
      <CardContent>
        {!!clinic?.referralCode && (
          <div className="mb-4 rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {facilityLabel} Join Code
            </p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono font-semibold tracking-wider text-foreground">
                {clinic.referralCode}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleCopyCode}
                title={`Copy ${facilityLabel.toLowerCase()} code`}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Share this code with team members so they can find and join your{" "}
              {facilityLabel.toLowerCase()}
            </p>
          </div>
        )}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            noValidate
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormFieldGroup
                  label={`${facilityLabel} Name`}
                  required
                  error={form.formState.errors.name?.message}
                >
                  <FormControl>
                    <Input
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
                  label="Display as"
                  hint="Controls whether the app shows Clinic or Hospital in key headings"
                >
                  <FormControl>
                    <Select
                      value={field.value ?? "CLINIC"}
                      onValueChange={(value) =>
                        field.onChange(value as "CLINIC" | "HOSPITAL")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select display label" />
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

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormFieldGroup
                  label="Address"
                  required
                  error={form.formState.errors.address?.message}
                >
                  <FormControl>
                    <Input placeholder="Enter address" {...field} />
                  </FormControl>
                </FormFieldGroup>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormFieldGroup
                  label="Phone Number"
                  required
                  error={form.formState.errors.phone?.message}
                >
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
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
                  error={form.formState.errors.gstin?.message}
                  hint="Needed for GST invoices on paid Indian plans. Keep this aligned with your tax registration."
                >
                  <FormControl>
                    <Input
                      placeholder="27ABCDE1234F1Z5"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                </FormFieldGroup>
              )}
            />

            <Button className="w-full" type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
