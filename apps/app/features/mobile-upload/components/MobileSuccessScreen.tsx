import React from "react";
import { CheckCircle2, FileText, Smartphone } from "lucide-react";

export function MobileSuccessScreen() {
  return (
    <div className="min-h-screen bg-linear-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center space-y-6">
          {/* Success Icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full animate-ping opacity-20" />
            <div className="relative bg-linear-to-br from-green-400 to-green-600 w-24 h-24 rounded-full flex items-center justify-center shadow-lg shadow-green-500/25">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-green-800 dark:text-green-300">
              Upload Complete!
            </h1>
            <p className="text-green-700/80 dark:text-green-400/80 text-sm leading-relaxed">
              Your document has been sent to the desktop successfully. You can
              safely close this page.
            </p>
          </div>

          {/* Visual indicator */}
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm">
            <Smartphone className="h-4 w-4" />
            <span className="text-xs">→</span>
            <FileText className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
