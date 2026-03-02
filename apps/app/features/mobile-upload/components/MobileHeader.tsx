import React from "react";
import { Camera } from "lucide-react";

export function MobileHeader() {
  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-sm mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-linear-to-br from-info to-primary flex items-center justify-center">
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-lg">Docita Scan</span>
        </div>
      </div>
    </div>
  );
}
