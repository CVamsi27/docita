"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOpdSlipSettings, useUpdateOpdSlipSettings } from "@workspace/data-access";
import { toast } from "sonner";
import { FormControl, FormField, FormItem, FormMessage, Input, Textarea } from "@workspace/ui/components/form/form-primitives";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Form, Label, Skeleton } from "@workspace/ui/components";
import { FileText, Save } from "lucide-react";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { opdSlipSettingsFormSchema, type OpdSlipSettingsFormValues } from "@workspace/types";

function OpdSlipSettings() {
  const {
    data: initialSettings,
    isLoading: loading,
    refetch,
  } = useOpdSlipSettings();
  const { mutate: updateSettings, isPending: saving } =
    useUpdateOpdSlipSettings();

  const form = useForm<OpdSlipSettingsFormValues>({
    resolver: zodResolver(opdSlipSettingsFormSchema),
    defaultValues: {
      revisitValidityDays: 0,
      footerNote: "",
    },
  });

  useEffect(() => {
    if (initialSettings) {
      form.reset({
        revisitValidityDays: initialSettings.revisitValidityDays ?? 0,
        footerNote: initialSettings.footerNote ?? "",
      });
    }
  }, [initialSettings, form]);

  const onSubmit = (values: OpdSlipSettingsFormValues) => {
    updateSettings(values, {
      onSuccess: () => {
        toast.success("OPD slip settings have been updated successfully");
        refetch();
      },
      onError: (error) => {
        showUserFacingErrorToast(
          error,
          "We could not save your OPD slip settings. Please try again.",
          "save",
        );
      },
    });
  };

  if (loading) {
    return (
      <Card
        role="status"
        aria-live="polite"
        aria-label="Loading OPD slip settings"
      >
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-1 h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>OPD prescription slip</CardTitle>
        </div>
        <CardDescription>
          Front desk staff can print a blank OPD prescription slip from any
          appointment. Configure the validity notice printed on it here.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-6"
          >
            <FormField
              control={form.control}
              name="revisitValidityDays"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="revisitValidityDays">
                    Free revisit window (days)
                  </Label>
                  <FormControl>
                    <Input
                      id="revisitValidityDays"
                      type="number"
                      min={0}
                      max={365}
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(event.target.valueAsNumber || 0)
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      className="max-w-[12rem]"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Printed on the slip: &ldquo;Valid for free revisit within
                    N days&rdquo;. Set to 0 to hide the notice.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="footerNote"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="footerNote">Footer note</Label>
                  <FormControl>
                    <Textarea
                      id="footerNote"
                      placeholder="Optional note printed at the bottom of the slip"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Appears alongside the standard disclaimer on every slip.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end border-t border-border/60 pt-4">
              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save settings"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export const OpdSlipSettingsContainer = OpdSlipSettings;
