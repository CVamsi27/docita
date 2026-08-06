import type { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ContactSalesFormValues } from "@workspace/types";
import { Button, FormControl, FormField, FormFieldGroup, Input, Textarea } from "@workspace/ui/components";
import { CheckCircle } from "lucide-react";

type ContactSalesForm = ReturnType<typeof useForm<ContactSalesFormValues>>;

/** Confirmation panel shown after a sales inquiry has been submitted successfully. */
export function ContactSalesSuccessPanel() {
  const { t } = useTranslation("Dialogs");
  return (
    <div className="text-center space-y-3 py-6">
      <div className="surface-success flex h-12 w-12 items-center justify-center rounded-full mx-auto">
        <CheckCircle className="h-6 w-6" />
      </div>
      <h3 className="font-semibold">{t("contactSales.successTitle")}</h3>
      <p className="text-sm text-muted-foreground">
        {t("contactSales.successBody")}
      </p>
    </div>
  );
}

/** Name / email / facility / message fields for the contact-sales form. */
export function ContactSalesFormFields({
  form,
  isSubmitting,
}: {
  form: ContactSalesForm;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation("Dialogs");
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormFieldGroup
            label={t("contactSales.name")}
            required
            error={form.formState.errors.name?.message}
          >
            <FormControl>
              <Input placeholder={t("contactSales.name")} {...field} disabled={isSubmitting} />
            </FormControl>
          </FormFieldGroup>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormFieldGroup
            label={t("contactSales.email")}
            required
            error={form.formState.errors.email?.message}
          >
            <FormControl>
              <Input
                type="email"
                placeholder={t("contactSales.email")}
                {...field}
                disabled={isSubmitting}
              />
            </FormControl>
          </FormFieldGroup>
        )}
      />

      <FormField
        control={form.control}
        name="clinic"
        render={({ field }) => (
          <FormFieldGroup label={t("contactSales.facilityName")} error={form.formState.errors.clinic?.message}>
            <FormControl>
              <Input
                placeholder={t("contactSales.facilityName")}
                {...field}
                value={field.value || ""}
                disabled={isSubmitting}
              />
            </FormControl>
          </FormFieldGroup>
        )}
      />

      <FormField
        control={form.control}
        name="message"
        render={({ field }) => (
          <FormFieldGroup
            label={t("contactSales.message")}
            required
            error={form.formState.errors.message?.message}
          >
            <FormControl>
              <Textarea
                placeholder={t("contactSales.messagePlaceholder")}
                rows={4}
                {...field}
                disabled={isSubmitting}
              />
            </FormControl>
          </FormFieldGroup>
        )}
      />
    </>
  );
}

/** Cancel / submit footer actions for the contact-sales form. */
export function ContactSalesFormFooter({
  isSubmitting,
  onClose,
}: {
  isSubmitting: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("Dialogs");
  return (
    <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        {t("contactSales.cancel")}
      </Button>
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? t("contactSales.sending") : t("contactSales.sendInquiry")}
      </Button>
    </div>
  );
}
