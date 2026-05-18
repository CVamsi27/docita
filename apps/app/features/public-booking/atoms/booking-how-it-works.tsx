"use client";

import { ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { Button } from "@workspace/ui/components/form/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/overlay/sheet";
import { bookingSteps } from "./booking-constants";
import { cn } from "@workspace/ui/lib/utils";

export function PublicBookingHowItWorksSheet({
  triggerClassName,
  appearance = "link",
}: {
  triggerClassName?: string;
  /**
   * `chip`: pill in dense mobile rows; `inline`: small pill beside hero copy (web);
   * `link`: text-style trigger.
   */
  appearance?: "link" | "chip" | "inline";
}) {
  const isChip = appearance === "chip";
  const isInline = appearance === "inline";
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant={isChip || isInline ? "outline" : "ghost"}
          className={cn(
            isChip &&
              "h-8 shrink-0 rounded-full px-3 text-[length:var(--fs-2xs)] font-semibold tracking-tight text-foreground shadow-xs transition-colors duration-150 hover:bg-muted/40",
            isInline &&
              "h-7 shrink-0 rounded-full border-border/70 px-2.5 py-0 text-[length:var(--fs-2xs)] font-semibold tracking-tight text-muted-foreground shadow-none transition-colors duration-150 hover:border-border hover:bg-muted/30 hover:text-foreground",
            !isChip &&
              !isInline &&
              "h-auto min-h-0 justify-start p-0 text-[length:var(--fs-xs)] font-medium text-primary underline-offset-4 hover:underline",
            triggerClassName,
          )}
        >
          How this works
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isInline ? "right" : "bottom"}
        className={cn(
          "gap-0 px-0",
          isInline
            ? "h-full max-h-[100dvh] w-[min(100%,22rem)] flex-col border-l pb-6 pt-2 sm:max-w-sm"
            : "pb-[max(1rem,env(safe-area-inset-bottom))]",
        )}
      >
        <SheetHeader className="border-b border-border/50 px-4 pb-3 pt-2 text-left sm:px-6">
          <SheetTitle className="text-left text-[length:var(--fs-lg)]">
            How booking works
          </SheetTitle>
          <SheetDescription className="text-left text-[length:var(--fs-xs)]">
            Three quick steps before the clinic confirms your visit.
          </SheetDescription>
        </SheetHeader>
        <div
          className={cn(
            "overflow-y-auto px-4 py-4 sm:px-6",
            isInline
              ? "min-h-0 flex-1 overscroll-contain"
              : "max-h-[min(60vh,28rem)]",
          )}
        >
          <ol className="list-decimal space-y-2 pl-5 text-[length:var(--fs-sm)] leading-relaxed text-muted-foreground">
            {bookingSteps.map((step) => (
              <li key={step}>
                <span className="font-medium text-foreground">{step}</span>
              </li>
            ))}
          </ol>
          <Alert className="mt-4 rounded-[var(--radius-md)] border border-border/70 bg-background shadow-sm [&>svg]:left-3 [&>svg]:top-3 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-primary [&>svg~*]:pl-6">
            <ShieldCheck className="shrink-0" aria-hidden />
            <AlertTitle className="mb-0.5 text-[length:var(--fs-2xs)] font-semibold tracking-wide">
              Private booking link
            </AlertTitle>
            <AlertDescription className="text-[length:var(--fs-2xs)] leading-snug text-muted-foreground">
              Only you and this care team see what you enter. Submitting is a
              request until staff confirms your visit.
            </AlertDescription>
          </Alert>
        </div>
      </SheetContent>
    </Sheet>
  );
}
