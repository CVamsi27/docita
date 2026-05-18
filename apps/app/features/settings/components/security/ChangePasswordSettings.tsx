"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Form, FormControl, FormField } from "@workspace/ui/components/form/form";
import { FormFieldGroup } from "@workspace/ui/components";
import { requiredStringSchema } from "@/lib/validation/common.schemas";
import { settingsApi } from "@/features/settings/api/settings.api";
import { PasswordStrengthIndicator } from "@/features/auth";

const changePasswordSchema = z
  .object({
    currentPassword: requiredStringSchema("Current Password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: requiredStringSchema("Confirm Password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordSettings() {
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
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
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            noValidate
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormFieldGroup
                  label="Current Password"
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
                  label="New Password"
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
                  label="Confirm New Password"
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

            <Button
              className="w-full"
              type="submit"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
