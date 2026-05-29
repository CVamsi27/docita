"use client";

import { SupportContact } from "@/components/support-contact/support-contact";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";

export function HelpSupportSettingsPanel() {
  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>Help &amp; support</CardTitle>
        <CardDescription>
          Reach the Docita team for product questions, onboarding, and account help.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        <SupportContact layout="stack" variant="footer" className="text-sm" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          For billing and subscription changes, admins can also use the WhatsApp
          shortcut under Billing and subscription.
        </p>
      </CardContent>
    </Card>
  );
}
