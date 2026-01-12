
import { ArrowLeft, User, PanelLeft } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@workspace/ui/components/sheet";

interface ConsultationPageHeaderUIProps {
  patientName: string;
  appointmentDate: string | Date;
  onBack: () => void;
  // We accept the full sidebar content for the mobile sheet
  MobileSidebarContent?: React.ReactNode;
}

export function ConsultationPageHeaderUI({
  patientName,
  appointmentDate,
  onBack,
  MobileSidebarContent,
}: ConsultationPageHeaderUIProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 py-3 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-sm">
      <div className="flex items-center gap-3 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Mobile sidebar toggle */}
        {MobileSidebarContent && (
            <Sheet>
            <SheetTrigger asChild>
                <Button
                variant="ghost"
                size="icon"
                className="md:hidden hover:bg-accent"
                >
                <PanelLeft className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
                {MobileSidebarContent}
            </SheetContent>
            </Sheet>
        )}

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold">{patientName}</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {new Date(appointmentDate).toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="hidden sm:flex gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Close
        </Button>
      </div>
    </header>
  );
}
