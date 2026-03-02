import React from "react";
import { CheckCircle2, FileText, Smartphone } from "lucide-react";

export function MobileSuccessScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center space-y-6">
          {}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-success rounded-full animate-ping opacity-20" />
            <div className="relative bg-success w-24 h-24 rounded-full flex items-center justify-center shadow-lg shadow-green-500/25">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
          </div>

          {}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-success">
              Upload Complete!
            </h1>
            <p className="text-success text-sm leading-relaxed">
              Your document has been sent to the desktop successfully. You can
              safely close this page.
            </p>
          </div>

          {}
          <div className="flex items-center justify-center gap-2 text-success text-sm">
            <Smartphone className="h-4 w-4" />
            <span className="text-xs">→</span>
            <FileText className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
