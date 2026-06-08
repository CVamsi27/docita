import type { useForm } from "react-hook-form";
import type { ContactSalesFormValues } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { CheckCircle } from "lucide-react";
import { FormControl, FormField } from "@workspace/ui/components/form/form";
import { FormFieldGroup } from "@workspace/ui/components";

type ContactSalesForm = ReturnType<typeof useForm<ContactSalesFormValues>>;

/** Confirmation panel shown after a sales inquiry has been submitted successfully. */
export function ContactSalesSuccessPanel() {
  return (
    <div className="text-center space-y-3 py-6">
      <div className="surface-success flex h-12 w-12 items-center justify-center rounded-full mx-auto">
        <CheckCircle className="h-6 w-6" />
      </div>
      <h3 className="font-semibold">Message Sent!</h3>
      <p className="text-sm text-muted-foreground">
        Thank you for reaching out. Our sales team will contact you within 24
        hours.
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
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormFieldGroup
            label="Name"
            required
            error={form.formState.errors.name?.message}
          >
            <FormControl>
              <Input placeholder="Name" {...field} disabled={isSubmitting} />
            </FormControl>
          </FormFieldGroup>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormFieldGroup
            label="Email"
            required
            error={form.formState.errors.email?.message}
          >
            <FormControl>
              <Input
                type="email"
                placeholder="Email"
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
          <FormFieldGroup label="Facility name" error={form.formState.errors.clinic?.message}>
            <FormControl>
              <Input
                placeholder="Facility name"
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
            label="Message"
            required
            error={form.formState.errors.message?.message}
          >
            <FormControl>
              <Textarea
                placeholder="Enter message"
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
  return (
    <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Sending…" : "Send Inquiry"}
      </Button>
    </div>
  );
}
