"use client";

import { type ReactNode, useCallback } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "./button";

interface PrintSheetProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  toolbar?: ReactNode;
  paperSize?: "a4" | "letter";
  hidePrintButton?: boolean;
}

export function PrintSheet({
  children,
  className,
  contentClassName,
  toolbar,
  paperSize = "a4",
  hidePrintButton = false,
}: PrintSheetProps) {
  const onPrint = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  return (
    <div className={cn("print-sheet", className)} data-paper={paperSize}>
      <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
        {toolbar}
        {!hidePrintButton ? (
          <Button type="button" onClick={onPrint} aria-label="Print document">
            Print
          </Button>
        ) : null}
      </div>
      <div
        className={cn(
          "mx-auto rounded-[var(--radius-md)] border border-border/60 bg-card p-6 shadow-sm print:border-0 print:p-0 print:shadow-none",
          paperSize === "a4" ? "max-w-[210mm]" : "max-w-[8.5in]",
          contentClassName,
        )}
      >
        {children}
      </div>
      <style>{`
        @media print {
          @page { size: ${paperSize === "a4" ? "A4" : "letter"}; margin: 12mm; }
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible; }
          .print-sheet { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
