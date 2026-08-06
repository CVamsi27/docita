import { Button, SymbolTooltip } from "@workspace/ui/components";
import { Stethoscope } from "lucide-react";

export function FloatingStartConsultation() {
  return (
    <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
      <SymbolTooltip label="Start consultation">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-md hover:shadow-lg"
          aria-label="Start consultation"
        >
          <Stethoscope className="h-6 w-6" />
        </Button>
      </SymbolTooltip>
    </div>
  );
}
