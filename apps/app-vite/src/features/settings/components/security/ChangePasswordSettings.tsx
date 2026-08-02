import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordFormSchema, type ChangePasswordFormValues } from "@workspace/types";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Form, FormControl, FormField, FormFieldGroup, Input } from "@workspace/ui/components";
import { settingsApi } from "@/features/settings/api/settings.api";
import { PasswordStrengthIndicator } from "@/features/auth/components/auth-password-strength";

export function ChangePasswordSettings() {
  const { t } = useTranslation("Patients.changePassword");
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
      toast.success(t("successToast"));
      form.reset();
    } catch (error) {
      showUserFacingErrorToast(error, t("errorFallback"), "save");
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
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
                  label={t("currentPasswordLabel")}
                  htmlFor="current-password"
                  required
                  error={form.formState.errors.currentPassword?.message}
                >
                  <FormControl id="current-password">
                    <Input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder={t("currentPasswordPlaceholder")}
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
                  label={t("newPasswordLabel")}
                  htmlFor="new-password"
                  required
                  error={form.formState.errors.newPassword?.message}
                >
                  <FormControl id="new-password">
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={t("newPasswordPlaceholder")}
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
                  label={t("confirmPasswordLabel")}
                  htmlFor="confirm-password"
                  required
                  error={form.formState.errors.confirmPassword?.message}
                >
                  <FormControl id="confirm-password">
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={t("confirmPasswordPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                </FormFieldGroup>
              )}
            />

            <div className="flex justify-end border-t border-border/60 pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t("submittingButton") : t("submitButton")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
