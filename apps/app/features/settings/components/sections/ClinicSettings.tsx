import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
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
  requiredStringSchema,
  phoneSchema,
} from "@/features/_shared/schemas/common.schemas";

const clinicSettingsSchema = z.object({
  name: requiredStringSchema("Clinic Name"),
  address: requiredStringSchema("Address"),
  phone: phoneSchema,
});

type ClinicSettingsFormValues = z.infer<typeof clinicSettingsSchema>;

export function ClinicGeneralSettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateClinic, isPending } = useUpdateClinicSettings();

  const form = useForm<ClinicSettingsFormValues>({
    resolver: zodResolver(clinicSettingsSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (clinic) {
      form.reset({
        name: clinic.name || "",
        address: clinic.address || "",
        phone: clinic.phone || "",
      });
    }
  }, [clinic, form]);

  const handleSubmit = (data: ClinicSettingsFormValues) => {
    updateClinic(data, {
      onSuccess: () => {
        toast.success("Clinic settings updated successfully");
      },
      onError: (error) => {
        toast.error("Failed to update settings: " + (error as Error).message);
      },
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Clinic Information</CardTitle>
        <CardDescription>Basic clinic settings and information</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormFieldGroup
                  label="Clinic Name"
                  required
                  error={form.formState.errors.name?.message}
                >
                  <FormControl>
                    <Input placeholder="Enter clinic name" {...field} />
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

            <Button className="w-full" type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
