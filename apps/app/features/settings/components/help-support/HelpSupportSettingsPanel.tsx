"use client";

import { SupportContact } from "@/components/common/support-contact";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function HelpSupportSettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Help and support</CardTitle>
        <CardDescription>
          Reach the Docita team for product questions, onboarding, and account help.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SupportContact layout="stack" variant="footer" className="text-sm" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          For billing and subscription changes, admins can also use the WhatsApp
          shortcut under Billing and subscription.
        </p>
      </CardContent>
    </Card>
  );
}
