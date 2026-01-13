"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ContactSalesModalUI,
  ContactSalesFormData,
} from "./ContactSalesModalUI";
import { apiHooks } from "@/lib/api-hooks";
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
  const [formData, setFormData] =
    useState<ContactSalesFormData>(initialFormData);
  const { mutate: createInquiry, isPending: isSubmitting } =
    apiHooks.useCreateContactInquiry();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.message.trim()
    ) {
      setError("Please fill in all required fields");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    createInquiry(formData, {
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
    setFormData(initialFormData);
    setSubmitted(false);
    onOpenChange(false);
  };
  return (
    <ContactSalesModalUI
      open={open}
      formData={formData}
      isSubmitting={isSubmitting}
      submitted={submitted}
      error={error}
      onChange={handleChange}
      onClose={handleClose}
      onSubmit={handleSubmit}
    />
  );
}

// Alias for backward compatibility
export { ContactSalesModalContainer as ContactSalesModal };
