"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ContactSalesFormData,
  ContactSalesModalUI,
} from "./ContactSalesModalUI";
import { useCreateContactInquiry } from "@/hooks/api/use-contact";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
interface ContactSalesModalContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
  defaultValues?: Partial<ContactSalesFormData>;
}
const initialFormData: ContactSalesFormData = {
  name: "",
  email: "",
  clinic: "",
  message: "",
};
export function ContactSalesModalContainer({
  open,
  onOpenChange,
  source,
  defaultValues,
}: ContactSalesModalContainerProps) {
  const { mutate: createInquiry, isPending: isSubmitting } =
    useCreateContactInquiry();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (data: ContactSalesFormData) => {
    setError(null);
    const normalizedMessage = data.message.trim();
    const sourceSuffix = source ? `\n\n[lead_source:${source}]` : "";
    const payload = {
      ...data,
      message: `${normalizedMessage}${sourceSuffix}`,
    };

    createInquiry(payload, {
      onSuccess: () => {
        setSubmitted(true);
        toast.success("Thank you! Our sales team will contact you soon.");
        setTimeout(() => handleClose(), 3000);
      },
      onError: (err: Error) => {
        const errorMessage =
          "We could not send your message. Please try again.";
        setError(errorMessage);
        showUserFacingErrorToast(err, errorMessage, "save");
      },
    });
  };

  const handleClose = () => {
    setSubmitted(false);
    onOpenChange(false);
  };

  return (
    <ContactSalesModalUI
      open={open}
      defaultValues={{
        ...initialFormData,
        ...defaultValues,
      }}
      isSubmitting={isSubmitting}
      submitted={submitted}
      error={error}
      onClose={handleClose}
      onSubmit={handleSubmit}
    />
  );
}

export { ContactSalesModalContainer as ContactSalesModal };
