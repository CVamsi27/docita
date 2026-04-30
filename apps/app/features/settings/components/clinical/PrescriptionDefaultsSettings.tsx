"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  usePrescriptionDefaults,
  useUpdatePrescriptionDefaults,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { FileText, Save } from "lucide-react";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  prescriptionDefaultsFormSchema,
  type PrescriptionDefaultsFormValues,
} from "@/features/settings/schemas/prescription-defaults-form.schema";

export function PrescriptionDefaultsSettings() {
  const {
    data: initialSettings,
    isLoading: loading,
    refetch,
  } = usePrescriptionDefaults();
  const { mutate: updateSettings, isPending: saving } =
    useUpdatePrescriptionDefaults();

  const form = useForm<PrescriptionDefaultsFormValues>({
    resolver: zodResolver(prescriptionDefaultsFormSchema),
    defaultValues: {
      defaultInstructions: "",
      defaultFooterText: "",
      includeClinicHeader: true,
      includeDoctorSignature: true,
      includeQRCode: false,
    },
  });

  useEffect(() => {
    if (initialSettings) {
      form.reset({
        defaultInstructions: initialSettings.defaultInstructions ?? "",
        defaultFooterText: initialSettings.defaultFooterText ?? "",
        includeClinicHeader: initialSettings.includeClinicHeader ?? true,
        includeDoctorSignature: initialSettings.includeDoctorSignature ?? true,
        includeQRCode: initialSettings.includeQRCode ?? false,
      });
    }
  }, [initialSettings, form]);

  const onSubmit = (values: PrescriptionDefaultsFormValues) => {
    updateSettings(values, {
      onSuccess: () => {
        toast.success("Prescription defaults have been updated successfully");
        refetch();
      },
      onError: (error) => {
        showUserFacingErrorToast(
          error,
          "We could not save your prescription defaults. Please try again.",
          "save",
        );
      },
    });
  };

  if (loading) {
    return (
      <Card>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Prescription Defaults</CardTitle>
        </div>
        <CardDescription>
          Set default values for all prescriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="defaultInstructions"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="defaultInstructions">Default Instructions</Label>
                  <FormControl>
                    <Textarea
                      id="defaultInstructions"
                      placeholder="e.g., Take medicines after food, Drink plenty of water, etc."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    These instructions will be pre-filled in every new prescription
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultFooterText"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="defaultFooterText">Footer Text</Label>
                  <FormControl>
                    <Textarea
                      id="defaultFooterText"
                      placeholder="e.g., For any queries, please contact us at..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    This text will appear at the bottom of every prescription
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <Label>Prescription Options</Label>

              <FormField
                control={form.control}
                name="includeClinicHeader"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        id="includeClinicHeader"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <label
                      htmlFor="includeClinicHeader"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include clinic header with logo and contact details
                    </label>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeDoctorSignature"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        id="includeDoctorSignature"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <label
                      htmlFor="includeDoctorSignature"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include doctor&apos;s signature and registration number
                    </label>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeQRCode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        id="includeQRCode"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <label
                      htmlFor="includeQRCode"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include QR code for verification
                    </label>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Defaults"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export const PrescriptionDefaultsSettingsContainer =
  PrescriptionDefaultsSettings;
