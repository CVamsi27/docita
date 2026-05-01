import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { Form, FormControl, FormField } from "@workspace/ui/components/form";
import { FormFieldGroup } from "@workspace/ui/components";
import {
  emailSchema,
  requiredStringSchema,
} from "@/features/_shared/schemas/common.schemas";

const contactSalesSchema = z.object({
  name: requiredStringSchema("Name"),
  email: emailSchema,
  clinic: z.string().optional(),
  message: requiredStringSchema("Message"),
});

type ContactSalesFormValues = z.infer<typeof contactSalesSchema>;

export type ContactSalesFormData = ContactSalesFormValues;

export interface ContactSalesModalUIProps {
  open: boolean;
  defaultValues?: Partial<ContactSalesFormValues>;
  isSubmitting: boolean;
  submitted: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (data: ContactSalesFormValues) => void;
}

export function ContactSalesModalUI({
  open,
  defaultValues,
  isSubmitting,
  submitted,
  error,
  onClose,
  onSubmit,
}: ContactSalesModalUIProps) {
  const form = useForm<ContactSalesFormValues>({
    resolver: zodResolver(contactSalesSchema),
    defaultValues: {
      name: "",
      email: "",
      clinic: "",
      message: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        email: "",
        clinic: "",
        message: "",
        ...defaultValues,
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (data: ContactSalesFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Sales
          </DialogTitle>
          <DialogDescription>
            Get in touch with our sales team to discuss your facility&apos;s needs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {submitted ? (
            <div className="text-center space-y-3 py-6">
              <div className="surface-success flex h-12 w-12 items-center justify-center rounded-full mx-auto">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">Message Sent!</h3>
              <p className="text-sm text-muted-foreground">
                Thank you for reaching out. Our sales team will contact you
                within 24 hours.
              </p>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                noValidate
                className="space-y-4"
              >
                {error && (
                  <Alert className="surface-danger">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

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
                        <Input
                          placeholder="Name"
                          {...field}
                          disabled={isSubmitting}
                        />
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
                    <FormFieldGroup
                      label="Facility Name"
                      error={form.formState.errors.clinic?.message}
                    >
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
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? "Sending..." : "Send Inquiry"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
