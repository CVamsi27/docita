import { Button, SymbolTooltip } from "@workspace/ui/components";
import { Link, useLocation } from "react-router";
import { Stethoscope } from "lucide-react";

export function FloatingStartConsultation({
  canStartConsultation,
}: {
  canStartConsultation: boolean;
}) {
  const { pathname } = useLocation();
  if (
    !canStartConsultation ||
    pathname === "/today" ||
    pathname === "/consultation" ||
    pathname.startsWith("/consultation/")
  )
    return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
      <SymbolTooltip label="Start consultation">
        <Button
          asChild
          variant="primary"
          size="icon"
          className="h-14 w-14 rounded-full shadow-md hover:shadow-lg"
          aria-label="Start consultation"
        >
          <Link to="/consultation" aria-label="Start consultation">
            <Stethoscope className="h-6 w-6" aria-hidden />
          </Link>
        </Button>
      </SymbolTooltip>
    </div>
  );
}
