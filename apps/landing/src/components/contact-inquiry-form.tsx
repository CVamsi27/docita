import { useState } from "react";
import { Send } from "lucide-react";

import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import { submitContactInquiry } from "@/lib/public-api";

interface ContactFormData {
  name: string;
  email: string;
  clinic: string;
  message: string;
}

interface ContactErrors {
  name?: string;
  email?: string;
  clinic?: string;
  message?: string;
}

const initialState: ContactFormData = {
  name: "",
  email: "",
  clinic: "",
  message: "",
};

function validateForm(data: ContactFormData): ContactErrors {
  const errors: ContactErrors = {};

  if (!data.name.trim()) {
    errors.name = "Enter your name.";
  }

  if (!data.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!data.clinic.trim()) {
    errors.clinic = "Enter your clinic name.";
  }

  if (!data.message.trim()) {
    errors.message = "Enter your message.";
  }

  return errors;
}

export function ContactInquiryForm() {
  const [formData, setFormData] = useState<ContactFormData>(initialState);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = (field: keyof ContactFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const resetForm = () => {
    setFormData(initialState);
    setErrors({});
    setSubmitError(null);
    setIsSubmitted(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitContactInquiry(formData);
      setIsSubmitted(true);
    } catch {
      setSubmitError("We could not send your message right now. Please try again in a few minutes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send us a message</CardTitle>
        <CardDescription>
          Share your clinic size and goals. We will respond with a practical rollout plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSubmitted ? (
          <div className="space-y-4 text-center">
            <p className="text-lg font-semibold">Message sent successfully</p>
            <p className="text-muted-foreground">
              Thank you for reaching out. Our team will contact you shortly.
            </p>
            <Button type="button" variant="outline" onClick={resetForm}>
              Send another message
            </Button>
          </div>
        ) : (
          <form noValidate className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Dr. A. Sharma"
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name ? (
                  <p className="text-sm text-destructive">{errors.name}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="doctor@clinic.com"
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email ? (
                  <p className="text-sm text-destructive">{errors.email}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinic">Clinic Name *</Label>
              <Input
                id="clinic"
                value={formData.clinic}
                onChange={(event) => updateField("clinic", event.target.value)}
                placeholder="Sunrise Family Clinic"
                aria-invalid={Boolean(errors.clinic)}
              />
              {errors.clinic ? (
                <p className="text-sm text-destructive">{errors.clinic}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                className="min-h-[140px]"
                value={formData.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Tell us your current workflow and what you want to improve."
                aria-invalid={Boolean(errors.message)}
              />
              {errors.message ? (
                <p className="text-sm text-destructive">{errors.message}</p>
              ) : null}
            </div>

            {submitError ? (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
