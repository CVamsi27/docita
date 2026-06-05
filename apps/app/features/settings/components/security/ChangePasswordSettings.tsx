"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordFormSchema,
  type ChangePasswordFormValues,
} from "@workspace/types";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import {
  Form,
  FormControl,
  FormField,
} from "@workspace/ui/components/form/form";
import { FormFieldGroup } from "@workspace/ui/components";
import { settingsApi } from "@/features/settings/api/settings.api";
import { PasswordStrengthIndicator } from "@/features/auth";

export function ChangePasswordSettings() {
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = form.watch("newPassword");

  const handleSubmit = async (data: ChangePasswordFormValues) => {
    try {
      await settingsApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password updated successfully");
      form.reset();
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not update your password. Please try again.",
        "save",
      );
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>Change password</CardTitle>
        <CardDescription>Update the password on your account.</CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            noValidate
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormFieldGroup
                  label="Current password"
                  htmlFor="current-password"
                  required
                  error={form.formState.errors.currentPassword?.message}
                >
                  <FormControl id="current-password">
                    <Input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter current password"
                      {...field}
                    />
                  </FormControl>
                </FormFieldGroup>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormFieldGroup
                  label="New password"
                  htmlFor="new-password"
                  required
                  error={form.formState.errors.newPassword?.message}
                >
                  <FormControl id="new-password">
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Enter new password"
                      {...field}
                    />
                  </FormControl>
                  <PasswordStrengthIndicator password={newPassword} />
                </FormFieldGroup>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormFieldGroup
                  label="Confirm new password"
                  htmlFor="confirm-password"
                  required
                  error={form.formState.errors.confirmPassword?.message}
                >
                  <FormControl id="confirm-password">
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Confirm password"
                      {...field}
                    />
                  </FormControl>
                </FormFieldGroup>
              )}
            />

            <div className="flex justify-end border-t border-border/60 pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
