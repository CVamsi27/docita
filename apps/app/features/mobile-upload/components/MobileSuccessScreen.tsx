import React from "react";
import { CheckCircle2, FileText, Smartphone } from "lucide-react";
import {
  Card,
  CardContent,
  SectionHeading
} from "@workspace/ui/components";

export function MobileSuccessScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm" density="spacious">
        <CardContent className="ui-section-stack text-center">
          <div className="relative mx-auto h-24 w-24">
            <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-20" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-success shadow-lg shadow-success/20">
              <CheckCircle2 className="h-12 w-12 text-success-foreground" />
            </div>
          </div>

          <SectionHeading
            align="center"
            size="page"
            title={<span className="text-success">Upload Complete!</span>}
            description="Your document has been sent to the desktop successfully. You can safely close this page."
            descriptionClassName="text-success"
          />

          <div className="flex items-center justify-center gap-2 text-sm text-success">
            <Smartphone className="h-4 w-4" />
            <span className="text-xs">→</span>
            <FileText className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
