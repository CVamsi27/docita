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

export interface ContactSalesFormData {
  name: string;
  email: string;
  clinic: string;
  message: string;
}

export interface ContactSalesModalUIProps {
  open: boolean;
  formData: ContactSalesFormData;
  isSubmitting: boolean;
  submitted: boolean;
  error: string | null;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ContactSalesModalUI({
  open,
  formData,
  isSubmitting,
  submitted,
  error,
  onChange,
  onClose,
  onSubmit,
}: ContactSalesModalUIProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
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
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold">Message Sent!</h3>
              <p className="text-sm text-muted-foreground">
                Thank you for reaching out. Our sales team will contact you
                within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-600">
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
                  onChange={onChange}
                  placeholder="Your name"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={onChange}
                  placeholder="your@email.com"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic">Clinic Name</Label>
                <Input
                  id="clinic"
                  name="clinic"
                  value={formData.clinic}
                  onChange={onChange}
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
                  onChange={onChange}
                  placeholder="Tell us about your needs..."
                  rows={4}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Inquiry"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
