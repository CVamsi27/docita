"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ContactSalesFormData,
  ContactSalesModalUI,
} from "./ContactSalesModalUI";
import { useCreateContactInquiry } from "@/hooks/api/use-contact";
interface ContactSalesModalContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}: ContactSalesModalContainerProps) {
  const { mutate: createInquiry, isPending: isSubmitting } =
    useCreateContactInquiry();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (data: ContactSalesFormData) => {
    setError(null);
    createInquiry(data, {
      onSuccess: () => {
        setSubmitted(true);
        toast.success("Thank you! Our sales team will contact you soon.");
        setTimeout(() => handleClose(), 3000);
      },
      onError: (err: Error) => {
        const errorMessage = err.message || "Failed to send inquiry";
        setError(errorMessage);
        toast.error(errorMessage);
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
      defaultValues={initialFormData}
      isSubmitting={isSubmitting}
      submitted={submitted}
      error={error}
      onClose={handleClose}
      onSubmit={handleSubmit}
    />
  );
}

// Alias for backward compatibility
export { ContactSalesModalContainer as ContactSalesModal };
