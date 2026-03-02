import { ArrowLeft, PanelLeft, User } from "lucide-react";
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

  MobileSidebarContent?: React.ReactNode;
}

export function ConsultationPageHeaderUI({
  patientName,
  appointmentDate,
  onBack,
  MobileSidebarContent,
}: ConsultationPageHeaderUIProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-sm">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 -ml-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {}
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
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">
              {patientName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {new Date(appointmentDate).toLocaleDateString("en-US", {
                weekday: "long",
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
          variant="secondary"
          size="sm"
          onClick={onBack}
          className="hidden sm:flex gap-2 h-9"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Button>
      </div>
    </header>
  );
}
