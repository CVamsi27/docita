"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Label } from "@workspace/ui/components/label";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { landingQueryKeys } from "@/lib/query-keys";
import { submitContactInquiry } from "@/lib/public-api";

export interface ContactSalesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactSalesModal({
  open,
  onOpenChange,
}: ContactSalesModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    clinic: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    message?: string;
  }>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const contactSalesMutation = useMutation({
    mutationKey: landingQueryKeys.contact.inquiry(),
    mutationFn: submitContactInquiry,
  });

  const isSubmitting = contactSalesMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors: { name?: string; email?: string; message?: string } = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    }
    if (!formData.message.trim()) {
      errors.message = "Message is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email.trim() && !emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await contactSalesMutation.mutateAsync(formData);

      setSubmitted(true);
      toast.success("Thank you! Our sales team will contact you soon.");

      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send inquiry";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      email: "",
      clinic: "",
      message: "",
    });
    setSubmitted(false);
    setError(null);
    setFieldErrors({});
    contactSalesMutation.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Sales
          </DialogTitle>
          <DialogDescription>
            Get in touch with our sales team to discuss your clinic&apos;s needs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {submitted ? (
            <div className="text-center space-y-3 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success dark:bg-success mx-auto">
                <CheckCircle className="h-6 w-6 text-success dark:text-success" />
              </div>
              <h3 className="font-semibold">Message Sent!</h3>
              <p className="text-sm text-muted-foreground">
                Thank you for reaching out. Our sales team will contact you
                within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {error && (
                <Alert className="border-destructive/30 bg-destructive dark:bg-destructive">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => {
                    handleChange(e);
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  placeholder="Your name"
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={
                    fieldErrors.name ? "landing-sales-name-error" : undefined
                  }
                  disabled={isSubmitting}
                />
                {fieldErrors.name && (
                  <p
                    id="landing-sales-name-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    handleChange(e);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="your@email.com"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={
                    fieldErrors.email ? "landing-sales-email-error" : undefined
                  }
                  disabled={isSubmitting}
                />
                {fieldErrors.email && (
                  <p
                    id="landing-sales-email-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic">Clinic Name</Label>
                <Input
                  id="clinic"
                  name="clinic"
                  value={formData.clinic}
                  onChange={handleChange}
                  placeholder="Your clinic name"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={(e) => {
                    handleChange(e);
                    if (fieldErrors.message) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        message: undefined,
                      }));
                    }
                  }}
                  placeholder="Tell us about your needs..."
                  rows={4}
                  aria-invalid={!!fieldErrors.message}
                  aria-describedby={
                    fieldErrors.message
                      ? "landing-sales-message-error"
                      : undefined
                  }
                  disabled={isSubmitting}
                />
                {fieldErrors.message && (
                  <p
                    id="landing-sales-message-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    "Send Inquiry"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
