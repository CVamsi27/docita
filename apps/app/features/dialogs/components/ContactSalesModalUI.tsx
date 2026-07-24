import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSalesFormSchema, type ContactSalesFormValues } from "@workspace/types";
import { Alert, AlertDescription, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Form } from "@workspace/ui/components";
import { AlertCircle, Mail } from "lucide-react";
import { ContactSalesSuccessPanel, ContactSalesFormFields, ContactSalesFormFooter } from "./ContactSalesModalUI.sections";

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
    resolver: zodResolver(contactSalesFormSchema),
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
            <ContactSalesSuccessPanel />
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

                <ContactSalesFormFields form={form} isSubmitting={isSubmitting} />

                <ContactSalesFormFooter isSubmitting={isSubmitting} onClose={onClose} />
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
