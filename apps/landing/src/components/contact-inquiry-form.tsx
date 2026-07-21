import { Send } from "lucide-react";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea } from "@workspace/ui/components";

export function ContactInquiryForm() {
  return (
    <div data-contact-inquiry-root id="book-demo">
      <Card>
        <CardHeader>
          <CardTitle>Book clinic setup</CardTitle>
          <CardDescription>
            Share your facility size and current workflow. We will respond with
            a practical rollout plan and setup estimate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div data-contact-success hidden className="space-y-4 text-center">
            <p className="text-lg font-semibold">Message sent successfully</p>
            <p className="text-muted-foreground">
              Thank you for reaching out. Our team will contact you shortly.
            </p>
            <Button type="button" variant="outline" data-contact-reset>
              Send another message
            </Button>
          </div>

          <form data-contact-form noValidate className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Full name"
                  aria-invalid="false"
                />
                <p
                  data-contact-error="name"
                  className="text-sm text-destructive"
                  hidden
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  aria-invalid="false"
                />
                <p
                  data-contact-error="email"
                  className="text-sm text-destructive"
                  hidden
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinic">Facility Name *</Label>
              <Input
                id="clinic"
                name="clinic"
                placeholder="Facility name"
                aria-invalid="false"
              />
              <p
                data-contact-error="clinic"
                className="text-sm text-destructive"
                hidden
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                name="message"
                className="min-h-[140px]"
                placeholder="Enter message"
                aria-invalid="false"
              />
              <p
                data-contact-error="message"
                className="text-sm text-destructive"
                hidden
              />
            </div>

            <div
              data-contact-submit-error
              className="hidden rounded-[var(--radius)] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            />

            <Button
              type="submit"
              data-contact-submit
              className="w-full sm:w-auto"
            >
              <Send className="mr-2 h-4 w-4" />
              <span data-contact-submit-label>Request setup</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
