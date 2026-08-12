import { Camera } from "lucide-react";

export function MobileHeader() {
  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-sm mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-lg">Docita Scan</span>
        </div>
      </div>
    </div>
  );
}
